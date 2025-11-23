import prisma, { type AppType } from "@openplane/db";
import {
  addIndexJob,
  fence,
  rateLimiter,
  type SyncJobData,
} from "@openplane/redis";
import type { Job } from "bullmq";
import { createConnector } from "../connectors/factory";
import { syncJobService } from "../services/sync-job-service";
import { batchSizeTracker, calculateBatchSize } from "../utils/batch-sizer";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

/**
 * Sync Worker - Processes sync jobs from the queue
 * Fetches data from external APIs (Slack, Notion, etc.)
 * Pushes batches to index queue
 */
export class SyncProcessor extends BaseProcessor<SyncJobData> {
  constructor() {
    super("sync", {
      concurrency: 5, // Process 5 sync jobs concurrently
      limiter: {
        max: 10,
        duration: 1000, // Max 10 jobs per second
      },
    });
  }

  /**
   * Process a single sync job with fencing protocol and rate limiting
   */
  protected async processJob(
    job: Job<SyncJobData>
  ): Promise<{ synced: number }> {
    let { connectorId, syncJobId, type } = job.data;

    logger.info(
      { jobId: job.id, connectorId, syncJobId, type },
      "Processing sync job"
    );

    // Check if another sync is already running for this connector
    const isAlreadyFenced = await fence.isFenced(connectorId);
    if (isAlreadyFenced) {
      const currentFenceToken = await fence.getCurrentToken(connectorId);
      logger.warn(
        {
          jobId: job.id,
          connectorId,
          type,
          currentFenceToken,
        },
        "Connector is already being synced by another worker, skipping this execution. Next scheduled run will retry."
      );
      // Don't throw - just skip this execution gracefully
      // The repeatable job will trigger again on the next schedule
      return { synced: 0 };
    }

    const fenceToken = await fence.acquireFence(connectorId);
    logger.info(
      { jobId: job.id, connectorId, fenceToken },
      "Acquired fence token"
    );

    try {
      // For repeatable jobs, syncJobId is empty - create SyncHistory dynamically
      if (!syncJobId) {
        syncJobId = await syncJobService.createSyncHistoryForRepeatableJob(
          connectorId,
          type
        );
        logger.info(
          { jobId: job.id, connectorId, syncJobId, type },
          "Created SyncHistory for repeatable job"
        );
      }

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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error(
        {
          error: errorMessage,
          errorStack,
          jobId: job.id,
          connectorId,
          fenceToken,
        },
        "Sync job failed"
      );

      // Only update sync history if we have a valid syncJobId
      if (syncJobId) {
        await syncJobService.handleSyncError(connectorId, syncJobId, error);
      }

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
    // Double-check fence is still valid (prevents race conditions)
    const isValid = await fence.validateFence(connectorId, fenceToken);
    if (!isValid) {
      const currentToken = await fence.getCurrentToken(connectorId);
      throw new Error(
        `Fence token mismatch: expected=${fenceToken}, current=${currentToken}. Another worker may have superseded this sync.`
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

      // Get the sync job to update nextRunAt
      await syncJobService.updateSyncJobNextRun(tx, syncJobId, connectorId);

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
}
