import prisma, {
  findConnectorById,
  findStorageKeysForCleanup,
  findTwelveLabsAssetsForCleanup,
  hardDeleteConnector,
} from "@openplane/db";
import { TwelveLabsClient } from "@openplane/media";
import type { ConnectorCleanupJobData } from "@openplane/redis";
import { jobSchedulerKeys } from "@openplane/redis";
import { getStorageProvider } from "@openplane/services";
import { vespaClient } from "@openplane/vespa";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobStart } from "../event-handlers";

function serializeError(
  error: unknown
): { message: string; name?: string; stack?: string } | unknown {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return error;
}

const tracer = trace.getTracer("openplane-worker");

export interface ConnectorCleanupResult {
  connectorId: string;
  vespaStats: {
    documents: number;
    media: number;
    entities: number;
  };
  storageStats: {
    files: number;
  };
  mediaStats: {
    assets: number;
  };
}

export async function processConnectorCleanup(
  job: Job<ConnectorCleanupJobData>
): Promise<ConnectorCleanupResult> {
  const span = tracer.startSpan("connector-cleanup-processor.process", {
    attributes: {
      "job.id": job.id ?? "",
      "connector.id": job.data.connectorId,
      "team.id": job.data.teamId,
    },
  });

  try {
    const { connectorId, teamId } = job.data;
    logJobStart("connector-cleanup", job.id, { connectorId, teamId });

    const connector = await findConnectorById(prisma, connectorId);
    if (!connector) {
      logger.warn(
        { connectorId },
        "Connector not found, may already be deleted"
      );
      return {
        connectorId,
        vespaStats: { documents: 0, media: 0, entities: 0 },
        storageStats: { files: 0 },
        mediaStats: { assets: 0 },
      };
    }

    if (connector.status !== "DELETING") {
      logger.info(
        { connectorId, status: connector.status },
        "Connector is no longer in DELETING status, skipping cleanup"
      );
      return {
        connectorId,
        vespaStats: { documents: 0, media: 0, entities: 0 },
        storageStats: { files: 0 },
        mediaStats: { assets: 0 },
      };
    }

    const vespaStats = await deleteVespaData(connectorId);
    await job.updateProgress(25);

    const storageStats = await deleteStorageFiles(connectorId);
    await job.updateProgress(50);

    const mediaStats = await deleteTwelveLabsAssets(connectorId);
    await job.updateProgress(75);

    await cleanupRedisKeys(connectorId);
    await job.updateProgress(90);

    await hardDeleteConnector(prisma, connectorId);
    await job.updateProgress(100);

    const result: ConnectorCleanupResult = {
      connectorId,
      vespaStats,
      storageStats,
      mediaStats,
    };

    logger.info(result, "Connector cleanup completed");

    span.setAttributes({
      "cleanup.vespa.documents": vespaStats.documents,
      "cleanup.vespa.media": vespaStats.media,
      "cleanup.vespa.entities": vespaStats.entities,
      "cleanup.storage.files": storageStats.files,
      "cleanup.media.assets": mediaStats.assets,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    return result;
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

async function deleteVespaData(
  connectorId: string
): Promise<{ documents: number; media: number; entities: number }> {
  logger.debug({ connectorId }, "Deleting Vespa data");

  const [docResult, mediaResult, entityResult] = await Promise.allSettled([
    vespaClient.deleteByConnectorId(connectorId, "openplane_document"),
    vespaClient.deleteByConnectorId(connectorId, "media_document"),
    vespaClient.deleteByConnectorId(connectorId, "entity"),
  ]);

  const documents =
    docResult.status === "fulfilled" ? docResult.value.deleted : 0;
  const media =
    mediaResult.status === "fulfilled" ? mediaResult.value.deleted : 0;
  const entities =
    entityResult.status === "fulfilled" ? entityResult.value.deleted : 0;

  if (docResult.status === "rejected") {
    logger.warn(
      { error: serializeError(docResult.reason), connectorId },
      "Failed to delete documents from Vespa"
    );
  }
  if (mediaResult.status === "rejected") {
    logger.warn(
      { error: serializeError(mediaResult.reason), connectorId },
      "Failed to delete media from Vespa"
    );
  }
  if (entityResult.status === "rejected") {
    logger.warn(
      { error: serializeError(entityResult.reason), connectorId },
      "Failed to delete entities from Vespa"
    );
  }

  logger.info(
    { connectorId, documents, media, entities },
    "Vespa data deleted"
  );

  return { documents, media, entities };
}

async function deleteStorageFiles(
  connectorId: string
): Promise<{ files: number }> {
  const storageKeys = await findStorageKeysForCleanup(prisma, connectorId);

  if (storageKeys.length === 0) {
    return { files: 0 };
  }

  const storage = getStorageProvider();
  const batchSize = 1000;

  for (let i = 0; i < storageKeys.length; i += batchSize) {
    const batch = storageKeys.slice(i, i + batchSize);
    await storage.deleteMany(batch);
  }

  logger.info(
    { connectorId, count: storageKeys.length },
    "Storage files deleted"
  );

  return { files: storageKeys.length };
}

async function deleteTwelveLabsAssets(
  connectorId: string
): Promise<{ assets: number }> {
  const assets = await findTwelveLabsAssetsForCleanup(prisma, connectorId);

  if (assets.length === 0) {
    return { assets: 0 };
  }

  const client = new TwelveLabsClient();
  const results = await Promise.allSettled(
    assets.map((asset) =>
      client.deleteIndexedAsset(
        asset.twelveLabsIndexId,
        asset.twelveLabsAssetId
      )
    )
  );

  let deleted = 0;
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      deleted += 1;
    } else {
      logger.warn(
        { error: serializeError(result.reason), asset: assets[index] },
        "Failed to delete TwelveLabs asset"
      );
    }
  }

  logger.info(
    { connectorId, deleted, total: assets.length },
    "TwelveLabs assets deleted"
  );

  return { assets: deleted };
}

async function cleanupRedisKeys(connectorId: string): Promise<void> {
  await jobSchedulerKeys.deleteAll(connectorId);
  logger.info({ connectorId }, "Redis keys cleaned up");
}
