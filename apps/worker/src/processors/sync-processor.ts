import prisma, { type AppType } from "@openplane/db";
import {
  addIndexJob,
  fence,
  getRedisConnection,
  rateLimiter,
  type SyncJobData,
} from "@openplane/redis";
import { type Job, Worker } from "bullmq";
import { createConnector } from "../connectors/factory";
import { batchSizeTracker, calculateBatchSize } from "../utils/batch-sizer";
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

    const fenceToken = await fence.acquireFence(connectorId);
    logger.info(
      { jobId: job.id, connectorId, fenceToken },
      "Acquired fence token"
    );

    try {
      await this.validateAndPrepare(connectorId, syncJobId, fenceToken);
      const connector = await this.loadConnectorWithRateLimit(connectorId);
      const cursor = await this.getSyncCursor(connectorId, type);

      if (!(await fence.validateFence(connectorId, fenceToken))) {
        throw new Error("Fence became invalid");
      }

      const connectorInstance = createConnector(connector);
      const isValid = await connectorInstance.validateConnection();
      if (!isValid) {
        throw new Error("Connector validation failed");
      }

      if (!(await fence.validateFence(connectorId, fenceToken))) {
        throw new Error("Fence became invalid");
      }

      const syncResult = await connectorInstance.sync(cursor);
      logger.info(
        { connectorId, documentsCount: syncResult.documents.length },
        "Documents fetched"
      );

      const batchCount = await this.enqueueBatches({
        connectorId,
        syncJobId,
        documents: syncResult.documents,
        appType: connector.app,
      });

      await this.updateSyncCompletion({
        connectorId,
        syncJobId,
        syncResult,
        batchCount,
        startTime: job.processedOn || Date.now(),
      });

      logger.info(
        {
          jobId: job.id,
          connectorId,
          documentsCount: syncResult.documents.length,
          fenceToken,
        },
        "Sync job completed successfully"
      );

      return { synced: syncResult.documents.length };
    } catch (error) {
      logger.error(
        { error, jobId: job.id, connectorId, fenceToken },
        "Sync job failed"
      );
      await this.handleSyncError(connectorId, syncJobId, error);
      throw error;
    } finally {
      await this.releaseFence(job.id, connectorId, fenceToken);
    }
  }

  private async validateAndPrepare(
    connectorId: string,
    syncJobId: string,
    fenceToken: number
  ) {
    if (!(await fence.validateFence(connectorId, fenceToken))) {
      throw new Error(
        "Fence token invalid - another worker is processing this connector"
      );
    }

    await prisma.$transaction(async (tx) => {
      const syncHistory = await tx.syncHistory.findUnique({
        where: { id: syncJobId },
        select: { syncJobId: true },
      });

      if (!syncHistory) {
        throw new Error(`SyncHistory ${syncJobId} not found`);
      }

      await tx.syncHistory.update({
        where: { id: syncJobId },
        data: { status: "SYNCING" },
      });

      await tx.$executeRawUnsafe(
        'UPDATE sync_job SET "fenceToken" = $1 WHERE _id = $2',
        fenceToken,
        syncHistory.syncJobId
      );
    });
  }

  private async loadConnectorWithRateLimit(connectorId: string) {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
      include: { oauthProvider: true },
    });

    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    const rateLimitCheck = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      connector.type
    );

    if (!rateLimitCheck.allowed) {
      logger.warn(
        { connectorId, reason: rateLimitCheck.reason },
        "Rate limit exceeded, waiting for quota"
      );

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

    return connector;
  }

  private async getSyncCursor(
    connectorId: string,
    type: "FULL" | "INCREMENTAL"
  ) {
    if (type !== "INCREMENTAL") {
      return;
    }

    const syncCursor = await prisma.syncCursor.findUnique({
      where: {
        connectorId_resource: { connectorId, resource: "messages" },
      },
    });

    return syncCursor?.cursor || undefined;
  }

  private async enqueueBatches(params: {
    connectorId: string;
    syncJobId: string;
    documents: unknown[];
    appType: string;
  }) {
    const { connectorId, syncJobId, documents, appType } = params;
    const metrics = batchSizeTracker.getMetrics(connectorId);
    const avgDocSize =
      documents.length > 0
        ? documents.reduce(
            (sum: number, doc) => sum + JSON.stringify(doc).length,
            0
          ) /
          documents.length /
          1024
        : undefined;

    const batchSize = calculateBatchSize(
      appType as AppType,
      metrics,
      avgDocSize
    );

    logger.info(
      { connectorId, batchSize, avgDocSizeKb: avgDocSize?.toFixed(2) },
      "Using adaptive batch size"
    );

    let batchCount = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchId = `${connectorId}-${Date.now()}-${i}`;
      const jobStartTime = Date.now();

      await addIndexJob({
        connectorId,
        documents: batch as never[],
        batchId,
        syncHistoryId: syncJobId,
      });

      batchSizeTracker.recordBatch(
        connectorId,
        batch.length,
        Date.now() - jobStartTime,
        0
      );
      batchCount += 1;
    }

    logger.info(
      { connectorId, batchCount, totalDocs: documents.length },
      "Pushed batches to index queue"
    );

    return batchCount;
  }

  private async updateSyncCompletion(params: {
    connectorId: string;
    syncJobId: string;
    syncResult: { nextCursor?: string; documents: unknown[] };
    batchCount: number;
    startTime: number;
  }) {
    const { connectorId, syncJobId, syncResult, batchCount, startTime } =
      params;
    await prisma.$transaction(async (tx) => {
      if (syncResult.nextCursor) {
        await tx.syncCursor.upsert({
          where: {
            connectorId_resource: { connectorId, resource: "messages" },
          },
          update: { cursor: syncResult.nextCursor, lastSyncedAt: new Date() },
          create: {
            connectorId,
            resource: "messages",
            cursor: syncResult.nextCursor,
            lastSyncedAt: new Date(),
          },
        });
      }

      await tx.syncHistory.update({
        where: { id: syncJobId },
        data: {
          status: "ACTIVE",
          summary: {
            totalDocuments: syncResult.documents.length,
            batches: batchCount,
            documentsFetched: syncResult.documents.length,
          },
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      });

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
  }

  private async handleSyncError(
    connectorId: string,
    syncJobId: string,
    error: unknown
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.syncHistory.update({
        where: { id: syncJobId },
        data: {
          status: "ERROR",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          finishedAt: new Date(),
        },
      });

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
  }

  private async releaseFence(
    jobId: string | undefined,
    connectorId: string,
    fenceToken: number
  ) {
    const released = await fence.releaseFence(connectorId, fenceToken);
    if (released) {
      logger.info({ jobId, connectorId, fenceToken }, "Released fence token");
    } else {
      logger.warn(
        { jobId, connectorId, fenceToken },
        "Failed to release fence token (may have been superseded)"
      );
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
