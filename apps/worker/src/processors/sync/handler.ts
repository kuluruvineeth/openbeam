import prisma, {
  getDisabledResourceExternalIds,
  upsertManyConnectorResources,
} from "@openplane/db";

import {
  addIndexJob,
  createLinkedSpan,
  rateLimiter,
  type SyncJobData,
} from "@openplane/redis";
import {
  createSyncHistoryForRepeatableJob,
  getSyncCursorForConnector,
  handleSyncError,
  prepareSyncHistory,
  updateSyncCompletion,
  updateSyncCursor,
} from "@openplane/services";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import {
  type ChannelInfo,
  syncConnectorStreaming,
  validateConnection,
} from "../../connectors/factory";
import logger from "../../utils/logger";
import { logJobError, logJobStart } from "../event-handlers";
import {
  acquireFence,
  checkFenceStatus,
  releaseFence,
  validateFence,
} from "./fence";

const tracer = trace.getTracer("openplane-worker");

export interface SyncJobResult {
  synced: number;
}

export async function processSyncJob(
  job: Job<SyncJobData>
): Promise<SyncJobResult> {
  let { connectorId, syncJobId, type, traceContext } = job.data;
  let fenceToken: number | undefined;

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
      syncJobId = await ensureSyncHistoryId(
        syncJobId,
        connectorId,
        type,
        job.id
      );

      await prepareSync(connectorId, syncJobId, fenceToken);

      const connector = await loadConnectorWithRateLimit(connectorId);
      const isValid = await validateConnection(connector);
      if (!isValid) {
        throw new Error("Connector validation failed");
      }

      if (!(await validateFence(connectorId, fenceToken))) {
        throw new Error("Fence became invalid during validation");
      }

      const cursorResult = await getSyncCursorForConnector(
        prisma,
        connectorId,
        type
      );

      const syncResult = await streamDocumentsToIndexQueue({
        connector,
        cursor: cursorResult.cursor,
        connectorId,
        syncJobId,
        type,
        fenceToken,
      });

      await updateSyncCompletion(prisma, {
        connectorId,
        syncHistoryId: syncJobId,
        nextCursor: syncResult.nextCursor,
        documentCount: syncResult.totalDocuments,
        batchCount: syncResult.batchCount,
        startTime: job.processedOn || Date.now(),
      });

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
  type: "FULL" | "INCREMENTAL";
  fenceToken: number;
}): Promise<{
  totalDocuments: number;
  batchCount: number;
  nextCursor?: string;
}> {
  const { connector, cursor, connectorId, syncJobId, type, fenceToken } =
    params;

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

    const result = await syncConnectorStreaming(connector, {
      cursor,
      forceFullSync: type === "FULL",
      syncFiles: true,
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
      onResourcesDiscovered: async (resources: ChannelInfo[]) => {
        const memberedChannels = resources.filter((r) => r.is_member);
        const nonMemberedChannels = resources.filter((r) => !r.is_member);

        logger.info(
          {
            connectorId,
            resourceCount: resources.length,
            memberedCount: memberedChannels.length,
            nonMemberedCount: nonMemberedChannels.length,
            memberedChannels: memberedChannels.map((r) => r.name),
            nonMemberedChannels: nonMemberedChannels.map((r) => r.name),
          },
          "Discovered resources during sync"
        );

        if (nonMemberedChannels.length > 0) {
          logger.warn(
            {
              connectorId,
              channels: nonMemberedChannels.map((r) => r.name),
            },
            "Bot is not a member of these channels. Add bot to sync their messages."
          );
        }

        await upsertManyConnectorResources(
          prisma,
          resources.map((r) => ({
            connectorId,
            externalId: r.id,
            resourceType: r.is_private ? "private_channel" : "public_channel",
            name: r.name,
            isPublic: !r.is_private,
            syncEnabled: true,
            metadata: {
              is_member: r.is_member ?? false,
            },
          }))
        );
      },
      disabledResourceIds,
    });

    span.setAttributes({
      "sync.total_documents": totalDocuments,
      "sync.batch_count": batchCount,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    logger.info(
      { connectorId, totalDocuments, batchCount },
      "Streaming sync completed"
    );

    return {
      totalDocuments,
      batchCount,
      nextCursor: result.nextCursor,
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

async function ensureSyncHistoryId(
  syncJobId: string | undefined,
  connectorId: string,
  type: "FULL" | "INCREMENTAL",
  jobId: string | undefined
): Promise<string> {
  if (syncJobId) {
    return syncJobId;
  }

  const result = await createSyncHistoryForRepeatableJob(prisma, {
    connectorId,
    type,
  });

  logger.info(
    { jobId, connectorId, syncJobId: result.syncHistoryId, type },
    "Created SyncHistory for repeatable job"
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
