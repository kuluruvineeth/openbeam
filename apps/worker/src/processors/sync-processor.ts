// TODO: Check back tracing after Bun supports OpenTelemetry
import prisma, { type AppType } from "@openplane/db";
import {
  addIndexJob,
  createLinkedSpan,
  fence,
  rateLimiter,
  type SyncJobData,
} from "@openplane/redis";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { createConnector } from "../connectors/factory";
import { syncJobService } from "../services/sync-job-service";
import { batchSizeTracker, calculateBatchSize } from "../utils/batch-sizer";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

const tracer = trace.getTracer("openplane-worker");

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

  protected async processJob(
    job: Job<SyncJobData>
  ): Promise<{ synced: number }> {
    let { connectorId, syncJobId, type, traceContext } = job.data;
    let fenceToken: number | undefined;

    // Create span linked to parent trace context from job data
    const span = createLinkedSpan(
      "openplane-worker",
      "sync-processor.process",
      traceContext,
      {
        "job.id": job.id || "",
        "connector.id": connectorId,
        "sync.type": type,
        "sync.job_id": syncJobId || "",
      }
    );

    try {
      logger.info(
        { jobId: job.id, connectorId, syncJobId, type },
        "Processing sync job"
      );

      const isAlreadyFenced = await this.checkFenceStatus(
        span,
        connectorId,
        job.id
      );
      if (isAlreadyFenced) {
        return { synced: 0 };
      }

      fenceToken = await this.acquireFenceWithSpan(span, connectorId, job.id);

      try {
        syncJobId = await this.ensureSyncJobId(
          syncJobId,
          connectorId,
          type,
          job.id
        );

        const { connector, cursor } = await this.prepareSync(
          connectorId,
          syncJobId,
          type,
          fenceToken
        );

        const syncResult = await this.fetchDocumentsWithSpan(
          connector,
          cursor,
          connectorId,
          type
        );

        const batchCount = await this.enqueueBatchesWithSpan(
          connectorId,
          syncJobId,
          syncResult.documents,
          connector.app
        );

        await this.updateCompletionWithSpan({
          connectorId,
          syncJobId,
          syncResult,
          batchCount,
          startTime: job.processedOn || Date.now(),
        });

        span.setAttributes({
          "sync.documents_synced": syncResult.documents.length,
          "sync.batch_count": batchCount,
        });
        span.setStatus({ code: SpanStatusCode.OK });

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
        await this.handleSyncError({
          span,
          error,
          jobId: job.id,
          connectorId,
          syncJobId,
          fenceToken,
        });
        throw error;
      } finally {
        if (fenceToken !== undefined) {
          await this.releaseFence(job.id, connectorId, fenceToken);
        }
      }
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  private async checkFenceStatus(
    span: ReturnType<typeof tracer.startSpan>,
    connectorId: string,
    jobId: string | undefined
  ): Promise<boolean> {
    const isAlreadyFenced = await fence.isFenced(connectorId);
    if (isAlreadyFenced) {
      const currentFenceToken = await fence.getCurrentToken(connectorId);
      span.setAttributes({
        "fence.already_fenced": true,
        "fence.current_token": String(currentFenceToken),
      });
      span.setStatus({ code: SpanStatusCode.OK });
      logger.warn(
        {
          jobId,
          connectorId,
          currentFenceToken,
        },
        "Connector is already being synced by another worker, skipping this execution. Next scheduled run will retry."
      );
      return true;
    }
    return false;
  }

  private async acquireFenceWithSpan(
    span: ReturnType<typeof tracer.startSpan>,
    connectorId: string,
    jobId: string | undefined
  ): Promise<number> {
    const fenceToken = await fence.acquireFence(connectorId);
    span.setAttribute("fence.token", String(fenceToken));
    logger.info({ jobId, connectorId, fenceToken }, "Acquired fence token");
    return fenceToken;
  }

  private async ensureSyncJobId(
    syncJobId: string | undefined,
    connectorId: string,
    type: "FULL" | "INCREMENTAL",
    jobId: string | undefined
  ): Promise<string> {
    if (!syncJobId) {
      const newSyncJobId =
        await syncJobService.createSyncHistoryForRepeatableJob(
          connectorId,
          type
        );
      logger.info(
        { jobId, connectorId, syncJobId: newSyncJobId, type },
        "Created SyncHistory for repeatable job"
      );
      return newSyncJobId;
    }
    return syncJobId;
  }

  private async prepareSync(
    connectorId: string,
    syncJobId: string,
    type: "FULL" | "INCREMENTAL",
    fenceToken: number
  ): Promise<{
    connector: Awaited<ReturnType<SyncProcessor["loadConnectorWithRateLimit"]>>;
    cursor: string | undefined;
  }> {
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

    return { connector, cursor };
  }

  async fetchDocumentsWithSpan(
    connector: Awaited<ReturnType<SyncProcessor["loadConnectorWithRateLimit"]>>,
    cursor: string | undefined,
    connectorId: string,
    type: "FULL" | "INCREMENTAL"
  ): Promise<{ documents: unknown[]; nextCursor?: string }> {
    const span = tracer.startSpan("sync-processor.fetch-documents", {
      attributes: {
        "connector.id": connectorId,
        "sync.type": type,
      },
    });
    try {
      const connectorInstance = createConnector(connector);
      const syncResult = await connectorInstance.sync(cursor);
      span.setAttributes({
        "sync.documents_count": syncResult.documents.length,
        "sync.has_next_cursor": !!syncResult.nextCursor,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      logger.info(
        { connectorId, documentsCount: syncResult.documents.length },
        "Documents fetched"
      );
      return syncResult;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  private async enqueueBatchesWithSpan(
    connectorId: string,
    syncJobId: string,
    documents: unknown[],
    appType: string
  ): Promise<number> {
    const span = tracer.startSpan("sync-processor.enqueue-batches", {
      attributes: {
        "connector.id": connectorId,
        "sync.documents_count": documents.length,
      },
    });
    try {
      const batchCount = await this.enqueueBatches({
        connectorId,
        syncJobId,
        documents,
        appType,
      });
      span.setAttributes({
        "sync.batch_count": batchCount,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return batchCount;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  private async updateCompletionWithSpan(params: {
    connectorId: string;
    syncJobId: string;
    syncResult: { nextCursor?: string; documents: unknown[] };
    batchCount: number;
    startTime: number;
  }): Promise<void> {
    const span = tracer.startSpan("sync-processor.update-completion");
    try {
      await this.updateSyncCompletion(params);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  private async handleSyncError(params: {
    span: ReturnType<typeof tracer.startSpan>;
    error: unknown;
    jobId: string | undefined;
    connectorId: string;
    syncJobId: string | undefined;
    fenceToken: number | undefined;
  }): Promise<void> {
    const { span, error, jobId, connectorId, syncJobId, fenceToken } = params;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorMessage,
    });
    span.recordException(error as Error);
    span.setAttributes({
      "error.type": error instanceof Error ? error.constructor.name : "Unknown",
    });

    logger.error(
      {
        error: errorMessage,
        errorStack,
        jobId,
        connectorId,
        fenceToken: fenceToken ?? null,
      },
      "Sync job failed"
    );

    if (syncJobId) {
      await syncJobService.handleSyncError(connectorId, syncJobId, error);
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
