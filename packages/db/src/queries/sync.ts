import type {
  GetSyncHistoryResult,
  GetSyncStatusResult,
  ScheduledSyncJob,
} from "@openplane/types/db";
import type { Database } from "../index";

export const getSyncStatus = async (
  db: Database,
  connectorId: string
): Promise<GetSyncStatusResult | null> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: {
      id: true,
      status: true,
      lastSyncedAt: true,
      lastSyncStatus: true,
      lastError: true,
      lastErrorAt: true,
      scheduledDeletionAt: true,
      webhookConfig: true,
    },
  });

  if (!connector) {
    return null;
  }

  const latestSync = await db.syncHistory.findFirst({
    where: { connectorId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      dataAdded: true,
      dataUpdated: true,
      dataDeleted: true,
      startedAt: true,
      finishedAt: true,
      errorMessage: true,
      durationMs: true,
      summary: true,
    },
  });

  const [
    totalDocuments,
    totalFiles,
    totalMedia,
    totalResources,
    totalSyncHistory,
    filesProcessing,
    filesIndexed,
    mediaProcessing,
    mediaIndexed,
  ] = await Promise.all([
    db.indexedDocument.count({ where: { connectorId } }),
    db.indexedFile.count({ where: { connectorId } }),
    db.indexedMedia.count({ where: { connectorId } }),
    db.connectorResource.count({ where: { connectorId } }),
    db.syncHistory.count({ where: { connectorId } }),
    db.indexedFile.count({
      where: {
        connectorId,
        processingStatus: { notIn: ["INDEXED", "FAILED"] },
      },
    }),
    db.indexedFile.count({
      where: { connectorId, processingStatus: "INDEXED" },
    }),
    db.indexedMedia.count({
      where: {
        connectorId,
        processingStatus: { notIn: ["INDEXED", "FAILED"] },
      },
    }),
    db.indexedMedia.count({
      where: { connectorId, processingStatus: "INDEXED" },
    }),
  ]);

  const totalIndexed = totalDocuments + totalFiles + totalMedia;

  const syncJobs = await db.syncJob.findMany({
    where: {
      connectorId,
      deletedAt: null,
      trigger: "SCHEDULED",
    },
    select: {
      id: true,
      type: true,
      schedule: true,
      nextRunAt: true,
      lastRanAt: true,
      config: true,
      priority: true,
      status: true,
    },
  });

  const fullSyncJob = syncJobs.find((job) => job.type === "FULL");
  const incrementalSyncJob = syncJobs.find((job) => job.type === "INCREMENTAL");

  const webhookConfig = connector.webhookConfig as
    | {
        enabled?: boolean;
        lastReceivedAt?: string;
        url?: string;
      }
    | null
    | undefined;

  return {
    connector: {
      id: connector.id,
      status: connector.status,
      lastSyncedAt: connector.lastSyncedAt,
      lastSyncStatus: connector.lastSyncStatus,
      lastError: connector.lastError,
      lastErrorAt: connector.lastErrorAt,
      scheduledDeletionAt: connector.scheduledDeletionAt,
    },
    latestSync: latestSync as GetSyncStatusResult["latestSync"],
    stats: {
      totalIndexed,
    },
    processing: {
      filesProcessing,
      filesIndexed,
      mediaProcessing,
      mediaIndexed,
    },
    resources: {
      total: totalResources,
    },
    syncHistory: {
      total: totalSyncHistory,
    },
    syncJobs: {
      full: fullSyncJob
        ? {
            ...fullSyncJob,
            config: fullSyncJob.config as Record<string, unknown>,
          }
        : null,
      incremental: incrementalSyncJob
        ? {
            ...incrementalSyncJob,
            config: incrementalSyncJob.config as Record<string, unknown>,
          }
        : null,
    },
    webhookStatus: {
      enabled: webhookConfig?.enabled ?? false,
      lastReceivedAt: webhookConfig?.lastReceivedAt
        ? new Date(webhookConfig.lastReceivedAt)
        : null,
      configured: !!webhookConfig,
    },
  };
};

export const getSyncHistory = async (
  db: Database,
  connectorId: string,
  options: { limit: number; offset: number }
): Promise<GetSyncHistoryResult> => {
  const [history, total] = await Promise.all([
    db.syncHistory.findMany({
      where: { connectorId },
      orderBy: { startedAt: "desc" },
      take: options.limit,
      skip: options.offset,
      select: {
        id: true,
        status: true,
        dataAdded: true,
        dataUpdated: true,
        dataDeleted: true,
        errorMessage: true,
        summary: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        syncJob: {
          select: {
            type: true,
            trigger: true,
          },
        },
      },
    }),
    db.syncHistory.count({
      where: { connectorId },
    }),
  ]);

  return {
    connectorId,
    history: history as GetSyncHistoryResult["history"],
    pagination: {
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total,
    },
  };
};

export const verifyConnectorOwnership = async (
  db: Database,
  connectorId: string,
  teamId: string
): Promise<{ id: string; status: string; teamId: string } | null> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, status: true, teamId: true },
  });

  if (!connector || connector.teamId !== teamId) {
    return null;
  }

  return connector;
};

export const findScheduledSyncJobs = async (
  db: Database
): Promise<ScheduledSyncJob[]> =>
  db.syncJob.findMany({
    where: {
      status: "PENDING",
      trigger: "SCHEDULED",
      deletedAt: null,
      schedule: { not: null },
      connector: { status: "ACTIVE" },
    },
    select: {
      id: true,
      connectorId: true,
      type: true,
      schedule: true,
      priority: true,
      config: true,
    },
  });

export const findSyncJobByConnectorAndType = async (
  db: Database,
  connectorId: string,
  type: "FULL" | "INCREMENTAL"
): Promise<ScheduledSyncJob | null> =>
  db.syncJob.findFirst({
    where: {
      connectorId,
      type,
      trigger: "SCHEDULED",
      deletedAt: null,
    },
    select: {
      id: true,
      connectorId: true,
      type: true,
      schedule: true,
      priority: true,
      config: true,
    },
  });
