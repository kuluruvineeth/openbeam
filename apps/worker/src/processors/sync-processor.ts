import prisma from "@openplane/db";
import {
  fence,
  getRedisConnection,
  type IndexJobData,
  indexQueue,
  rateLimiter,
  type SyncJobData,
} from "@openplane/redis";
import { type Job, Worker } from "bullmq";
import { batchSizeTracker, calculateBatchSize } from "../utils/batch-sizer";
import { createConnector } from "../connectors/factory";
import logger from "../utils/logger";

/**
 * Sync Worker - Processes sync jobs from the queue
 * Fetches data from external APIs (Slack, Notion, etc.)
 * Pushes batches to index queue
 */
export class SyncProcessor {
  private worker: Worker | null = null;
  private readonly initialization: Promise<void>;

  constructor() {
    this.initialization = this.initialize();
  }

  private async initialize(): Promise<void> {
    const connection = await getRedisConnection();

    const worker = new Worker(
      "sync",
      async (job: Job<SyncJobData>) => this.processJob(job),
      {
        connection,
        concurrency: 5, // Process 5 sync jobs concurrently
        limiter: {
          max: 10,
          duration: 1000, // Max 10 jobs per second
        },
      }
    );

    this.setupEventHandlers(worker);
    this.worker = worker;
  }

  /**
   * Process a single sync job with fencing protocol and rate limiting
   */
  private async processJob(job: Job<SyncJobData>): Promise<{ synced: number }> {
    const { connectorId, syncJobId, type } = job.data;

    logger.info(
      { jobId: job.id, connectorId, syncJobId, type },
      "Processing sync job"
    );

    // STEP 0: Acquire fence token for exactly-once execution
    const fenceToken = await fence.acquireFence(connectorId);
    logger.info(
      { jobId: job.id, connectorId, fenceToken },
      "Acquired fence token"
    );

    try {
      // Validate fence is still current (prevents race conditions)
      if (!(await fence.validateFence(connectorId, fenceToken))) {
        throw new Error(
          "Fence token invalid - another worker is processing this connector"
        );
      }

      // 1. Load connector from database
      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        include: { oauthProvider: true },
      });

      if (!connector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      // Check rate limit before proceeding
      const rateLimitCheck = await rateLimiter.checkConnectorRateLimit(
        connectorId,
        connector.type
      );

      if (!rateLimitCheck.allowed) {
        logger.warn(
          {
            connectorId,
            reason: rateLimitCheck.reason,
          },
          "Rate limit exceeded, waiting for quota"
        );

        // Wait for quota with exponential backoff
        const quotaAvailable = await rateLimiter.waitForQuota(
          connectorId,
          connector.type
        );

        if (!quotaAvailable) {
          throw new Error(
            `Rate limit exceeded: ${rateLimitCheck.reason}. Max retries exhausted.`
          );
        }
      }

      // 2. Update sync job status to SYNCING and store fence token
      await prisma.$transaction(async (tx) => {
        await tx.syncHistory.update({
          where: { id: syncJobId },
          data: { status: "SYNCING" },
        });

        // Store fence token in sync job for audit
        await tx.syncJob.update({
          where: {
            connectorId_resource: {
              connectorId,
              resource: "messages",
            },
          },
          data: { fenceToken },
        });
      });

      // 3. Get sync cursor for incremental sync
      let cursor: string | undefined;
      if (type === "INCREMENTAL") {
        const syncCursor = await prisma.syncCursor.findUnique({
          where: {
            connectorId_resource: {
              connectorId,
              resource: "messages", // Generic resource name
            },
          },
        });
        cursor = syncCursor?.cursor || undefined;
      }

      // 4. Instantiate connector using factory
      const connectorInstance = createConnector(connector);

      // 5. Validate connection
      const isValid = await connectorInstance.validateConnection();
      if (!isValid) {
        throw new Error("Connector validation failed");
      }

      // Validate fence again before expensive operation
      if (!(await fence.validateFence(connectorId, fenceToken))) {
        throw new Error("Fence token became invalid during processing");
      }

      // 6. Fetch documents
      const syncResult = await connectorInstance.sync(cursor);
      const { documents } = syncResult;

      logger.info(
        { connectorId, documentsCount: documents.length },
        "Documents fetched"
      );

      // 7. Push documents to index queue with adaptive batch sizing
      const metrics = batchSizeTracker.getMetrics(connectorId);
      const avgDocSize = documents.length > 0
        ? documents.reduce((sum, doc) => sum + JSON.stringify(doc).length, 0) / documents.length / 1024
        : undefined;

      const batchSize = calculateBatchSize(connector.type, metrics, avgDocSize);

      logger.info(
        { connectorId, batchSize, avgDocSizeKb: avgDocSize?.toFixed(2) },
        "Using adaptive batch size"
      );

      let batchCount = 0;
      const batchStartTime = Date.now();

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchId = `${connectorId}-${Date.now()}-${i}`;

        const jobStartTime = Date.now();
        await indexQueue.add(
          "index-batch",
          {
            connectorId,
            documents: batch,
            batchId,
          } as IndexJobData,
          {
            attempts: 2,
            backoff: { type: "exponential", delay: 2000 },
          }
        );

        const jobEndTime = Date.now();
        batchSizeTracker.recordBatch(
          connectorId,
          batch.length,
          jobEndTime - jobStartTime,
          0 // No errors at enqueue time
        );

        batchCount += 1;
      }

      logger.info(
        { connectorId, batchCount, totalDocs: documents.length },
        "Pushed batches to index queue"
      );

      // 8-10. Update cursor, sync history, and connector in a single transaction
      const startTime = job.processedOn || Date.now();
      await prisma.$transaction(async (tx) => {
        // Update sync cursor if there's a next cursor
        if (syncResult.nextCursor) {
          await tx.syncCursor.upsert({
            where: {
              connectorId_resource: {
                connectorId,
                resource: "messages",
              },
            },
            update: {
              cursor: syncResult.nextCursor,
              lastSyncedAt: new Date(),
            },
            create: {
              connectorId,
              resource: "messages",
              cursor: syncResult.nextCursor,
              lastSyncedAt: new Date(),
            },
          });
        }

        // Update sync history with results
        await tx.syncHistory.update({
          where: { id: syncJobId },
          data: {
            status: "ACTIVE",
            dataAdded: documents.length,
            summary: {
              totalDocuments: documents.length,
              batches: batchCount,
            },
            finishedAt: new Date(),
            durationMs: Date.now() - startTime,
          },
        });

        // Update connector last sync status
        await tx.connector.update({
          where: { id: connectorId },
          data: {
            lastSyncedAt: new Date(),
            lastSyncStatus: "SUCCESS",
            status: "ACTIVE",
            lastError: null,
            lastErrorAt: null,
            retryCount: 0,
          },
        });
      });

      logger.info(
        { jobId: job.id, connectorId, documentsCount: documents.length, fenceToken },
        "Sync job completed successfully"
      );

      return { synced: documents.length };
    } catch (error) {
      logger.error({ error, jobId: job.id, connectorId, fenceToken }, "Sync job failed");

      // Update sync history and connector error state in a single transaction
      await prisma.$transaction(async (tx) => {
        // Update sync history with error
        await tx.syncHistory.update({
          where: { id: syncJobId },
          data: {
            status: "ERROR",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            finishedAt: new Date(),
          },
        });

        // Update connector error state
        await tx.connector.update({
          where: { id: connectorId },
          data: {
            lastSyncStatus: "FAILED",
            lastError: error instanceof Error ? error.message : "Unknown error",
            lastErrorAt: new Date(),
            retryCount: { increment: 1 },
          },
        });
      });

      throw error;
    } finally {
      // CRITICAL: Always release fence, even on error
      const released = await fence.releaseFence(connectorId, fenceToken);
      if (released) {
        logger.info(
          { jobId: job.id, connectorId, fenceToken },
          "Released fence token"
        );
      } else {
        logger.warn(
          { jobId: job.id, connectorId, fenceToken },
          "Failed to release fence token (may have been superseded)"
        );
      }
    }
  }

  /**
   * Setup event handlers for the worker
   */
  private setupEventHandlers(worker: Worker) {
    worker.on("completed", (job) => {
      logger.info({ jobId: job.id }, "Sync job completed");
    });

    worker.on("failed", (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, "Sync job failed");
    });

    worker.on("error", (error) => {
      logger.error({ error }, "Sync worker error");
    });

    worker.on("stalled", (jobId) => {
      logger.warn({ jobId }, "Sync job stalled");
    });
  }

  /**
   * Gracefully close the worker
   */
  async close(): Promise<void> {
    await this.initialization;
    if (this.worker) {
      await this.worker.close();
      logger.info("Sync processor closed");
    }
  }

  /**
   * Get worker instance for testing
   */
  getWorker(): Worker {
    if (!this.worker) {
      throw new Error("Sync worker not initialized");
    }
    return this.worker;
  }
}
