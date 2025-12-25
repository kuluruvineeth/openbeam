import prisma, {
  getDisabledResourceExternalIds,
  upsertManyConnectorResources,
} from "@openplane/db";

import {
  addIndexJob,
  createLinkedSpan,
  createProgressEmitter,
  rateLimiter,
  type SyncJobData,
  type SyncTrigger,
} from "@openplane/redis";

import {
  createSyncHistoryForRepeatableJob,
  createSyncHistoryForWebhook,
  getSyncCursorForConnector,
  handleSyncError,
  prepareSyncHistory,
  updateSyncCompletion,
  updateSyncCursor,
} from "@openplane/services";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import {
  type ResourceInfo,
  syncConnectorStreaming,
  validateConnection,
} from "../../connectors/factory";
import logger from "../../utils/logger";
import { logJobError, logJobStart } from "../event-handlers";
import { processDiscoveredFiles } from "../file/sync-helper";
import {
  acquireFence,
  checkFenceStatus,
  releaseFence,
  validateFence,
} from "./fence";

const tracer = trace.getTracer("openplane-worker");

type ProgressEmitter = ReturnType<typeof createProgressEmitter>;

async function emitProgressFailure(
  progress: ProgressEmitter | undefined,
  error: unknown,
  totalProcessed: number
): Promise<void> {
  if (!progress) {
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  await progress.fail(message, totalProcessed);
}

export interface SyncJobResult {
  synced: number;
}

export async function processSyncJob(
  job: Job<SyncJobData>
): Promise<SyncJobResult> {
  let { connectorId, syncJobId, type, trigger, traceContext } = job.data;
  let fenceToken: number | undefined;
  let progress: ProgressEmitter | undefined;
  let totalDocumentsProcessed = 0;

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
    logJobStart("sync", job.id, { connectorId, syncJobId, type });

    const fenceCheck = await checkFenceStatus(connectorId, job.id, span);
    if (fenceCheck.isFenced) {
      return { synced: 0 };
    }

    fenceToken = await acquireFence(connectorId, job.id, span);

    try {
      syncJobId = await ensureSyncHistoryId({
        syncJobId,
        connectorId,
        type,
        trigger,
        jobId: job.id,
      });

      await prepareSync(connectorId, syncJobId, fenceToken);

      const connector = await loadConnectorWithRateLimit(connectorId);
      const isValid = await validateConnection(connector);
      if (!isValid) {
        throw new Error("Connector validation failed");
      }

      if (!(await validateFence(connectorId, fenceToken))) {
        throw new Error("Fence became invalid during validation");
      }

      progress = createProgressEmitter({
        id: syncJobId,
        teamId: connector.teamId,
        type: "sync",
        connectorId,
        connectorName: connector.name ?? undefined,
      });

      const cursorResult = await getSyncCursorForConnector(
        prisma,
        connectorId,
        type
      );

      await progress.start(0, "Fetching data");

      const syncResult = await streamDocumentsToIndexQueue({
        connector,
        cursor: cursorResult.cursor,
        connectorId,
        syncJobId,
        type,
        fenceToken,
        progress,
      });

      totalDocumentsProcessed = syncResult.totalDocuments;

      await updateSyncCompletion(prisma, {
        connectorId,
        syncHistoryId: syncJobId,
        nextCursor: syncResult.nextCursor,
        documentCount: syncResult.totalDocuments,
        batchCount: syncResult.batchCount,
        startTime: job.processedOn || Date.now(),
        filesQueued: syncResult.filesQueued,
        mediaQueued: syncResult.mediaQueued,
      });

      const totalItemsSynced =
        syncResult.totalDocuments +
        syncResult.filesQueued +
        syncResult.mediaQueued;
      await progress.complete(totalItemsSynced);

      span.setAttributes({
        "sync.documents_synced": syncResult.totalDocuments,
        "sync.batch_count": syncResult.batchCount,
        "sync.streaming": true,
      });
      span.setStatus({ code: SpanStatusCode.OK });

      logger.info(
        {
          jobId: job.id,
          connectorId,
          documentsCount: syncResult.totalDocuments,
          batchCount: syncResult.batchCount,
          fenceToken,
        },
        "Sync job completed successfully (streaming mode)"
      );

      return { synced: syncResult.totalDocuments };
    } catch (error) {
      await emitProgressFailure(progress, error, totalDocumentsProcessed);
      await handleJobError({
        error,
        jobId: job.id,
        connectorId,
        syncJobId,
        span,
      });
      throw error;
    } finally {
      if (fenceToken !== undefined) {
        await releaseFence(connectorId, fenceToken, job.id);
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

async function streamDocumentsToIndexQueue(params: {
  connector: Awaited<ReturnType<typeof loadConnectorWithRateLimit>>;
  cursor: string | undefined;
  connectorId: string;
  syncJobId: string;
  type: "FULL" | "INCREMENTAL" | "PERMISSIONS";
  fenceToken: number;
  progress: ReturnType<typeof createProgressEmitter>;
}): Promise<{
  totalDocuments: number;
  batchCount: number;
  nextCursor?: string;
  filesQueued: number;
  mediaQueued: number;
}> {
  const {
    connector,
    cursor,
    connectorId,
    syncJobId,
    type,
    fenceToken,
    progress,
  } = params;

  const span = tracer.startSpan("sync-processor.stream-documents", {
    attributes: {
      "connector.id": connectorId,
      "sync.type": type,
      "sync.streaming": true,
    },
  });

  let totalDocuments = 0;
  let batchCount = 0;
  let lastCursor: string | undefined;

  try {
    const disabledResourceIds = await getDisabledResourceExternalIds(
      prisma,
      connectorId,
      "channel"
    );

    const config = (connector.config ?? {}) as {
      index_dms?: boolean;
      index_private_channels?: boolean;
      index_group_dms?: boolean;
      federated_include_group_dms?: boolean;
      sync_files?: boolean;
      index_canvases?: boolean;
      index_clips?: boolean;
      index_bookmarks?: boolean;
    };

    const result = await syncConnectorStreaming(connector, {
      cursor,
      forceFullSync: type === "FULL",
      syncFiles: config.sync_files ?? true,
      indexDms: config.index_dms ?? false,
      indexGroupDms:
        config.index_group_dms ?? config.federated_include_group_dms ?? false,
      syncCanvases: config.index_canvases ?? true,
      syncClips: config.index_clips ?? true,
      syncBookmarks: config.index_bookmarks ?? true,
      onStageChange: async (stage, current, item) => {
        await progress.update(current, current + 100, stage, item);
      },
      onBatch: async (batch) => {
        if (!(await validateFence(connectorId, fenceToken))) {
          throw new Error("Fence became invalid during streaming");
        }

        const batchId = `${connectorId}-${Date.now()}-${batchCount}`;

        await addIndexJob({
          connectorId,
          documents: batch.items as never[],
          batchId,
          syncHistoryId: syncJobId,
        });

        await updateSyncCursor(prisma, connectorId, batch.cursor);

        totalDocuments += batch.items.length;
        batchCount += 1;
        lastCursor = batch.cursor;

        await progress.update(
          totalDocuments,
          batch.hasMore ? totalDocuments + 100 : totalDocuments,
          "Queueing",
          `Batch ${batchCount}`
        );

        logger.debug(
          {
            connectorId,
            batchId,
            batchNumber: batchCount,
            documentsInBatch: batch.items.length,
            totalSoFar: totalDocuments,
            hasMore: batch.hasMore,
          },
          "Streamed batch to index queue"
        );
      },
      onResourcesDiscovered: async (resources: ResourceInfo[]) => {
        const memberedResources = resources.filter((r) => r.isMember);
        const nonMemberedResources = resources.filter((r) => !r.isMember);

        logger.info(
          {
            connectorId,
            resourceCount: resources.length,
            memberedCount: memberedResources.length,
            nonMemberedCount: nonMemberedResources.length,
            memberedResources: memberedResources.map((r) => r.name),
            nonMemberedResources: nonMemberedResources.map((r) => r.name),
          },
          "Discovered resources during sync"
        );

        if (nonMemberedResources.length > 0) {
          logger.warn(
            {
              connectorId,
              resources: nonMemberedResources.map((r) => r.name),
            },
            "Bot is not a member of these resources. Add bot to sync their messages."
          );
        }

        await upsertManyConnectorResources(
          prisma,
          resources.map((r) => ({
            connectorId,
            externalId: r.id,
            resourceType: r.resourceType,
            name: r.name,
            isPublic: !r.isPrivate,
            syncEnabled: true,
            metadata: r.metadata as Record<
              string,
              string | number | boolean | null
            >,
          }))
        );
      },
      disabledResourceIds,
      onFilesDiscovered: processDiscoveredFiles,
    });

    span.setAttributes({
      "sync.total_documents": totalDocuments,
      "sync.batch_count": batchCount,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    logger.info(
      {
        connectorId,
        totalDocuments,
        batchCount,
        filesQueued: result.filesQueued,
        mediaQueued: result.mediaQueued,
      },
      "Streaming sync completed"
    );

    return {
      totalDocuments,
      batchCount,
      nextCursor: result.nextCursor,
      filesQueued: result.filesQueued,
      mediaQueued: result.mediaQueued,
    };
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);

    logger.error(
      {
        connectorId,
        documentsBeforeError: totalDocuments,
        batchesBeforeError: batchCount,
        lastCursor,
        error: error instanceof Error ? error.message : String(error),
      },
      "Streaming sync failed"
    );

    throw error;
  } finally {
    span.end();
  }
}

interface EnsureSyncHistoryParams {
  syncJobId: string | undefined;
  connectorId: string;
  type: "FULL" | "INCREMENTAL" | "PERMISSIONS";
  trigger: SyncTrigger | undefined;
  jobId: string | undefined;
}

async function ensureSyncHistoryId(
  params: EnsureSyncHistoryParams
): Promise<string> {
  const { syncJobId, connectorId, type, trigger, jobId } = params;

  if (syncJobId) {
    return syncJobId;
  }

  const result =
    trigger === "WEBHOOK"
      ? await createSyncHistoryForWebhook(prisma, { connectorId, type })
      : await createSyncHistoryForRepeatableJob(prisma, { connectorId, type });

  logger.info(
    { jobId, connectorId, syncJobId: result.syncHistoryId, type, trigger },
    `Created SyncHistory for ${trigger ?? "scheduled"} job`
  );

  return result.syncHistoryId;
}

async function prepareSync(
  connectorId: string,
  syncHistoryId: string,
  fenceToken: number
): Promise<void> {
  const isValid = await validateFence(connectorId, fenceToken);
  if (!isValid) {
    throw new Error(
      "Fence token mismatch. Another worker may have superseded this sync."
    );
  }

  await prepareSyncHistory(prisma, syncHistoryId, fenceToken);
}

async function loadConnectorWithRateLimit(connectorId: string) {
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

async function handleJobError(params: {
  error: unknown;
  jobId: string | undefined;
  connectorId: string;
  syncJobId: string | undefined;
  span: ReturnType<typeof tracer.startSpan>;
}): Promise<void> {
  const { error, jobId, connectorId, syncJobId, span } = params;

  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
  span.recordException(error as Error);
  span.setAttributes({
    "error.type": error instanceof Error ? error.constructor.name : "Unknown",
  });

  logJobError("sync", jobId, error, { connectorId });

  if (syncJobId) {
    await handleSyncError(prisma, {
      connectorId,
      syncHistoryId: syncJobId,
      error,
    });
  }
}
