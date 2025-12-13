import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface SyncJobInfo {
  id: string;
  type: string;
  schedule: string | null;
  nextRunAt: Date | null;
  lastRanAt: Date | null;
  config: Record<string, unknown>;
  priority: number;
  status: string;
}

export interface GetSyncStatusResult {
  connector: {
    id: string;
    status: string;
    lastSyncedAt: Date | null;
    lastSyncStatus: string | null;
    lastError: string | null;
    lastErrorAt: Date | null;
  };
  latestSync: {
    id: string;
    status: string;
    dataAdded: number;
    dataUpdated: number;
    dataDeleted: number;
    startedAt: Date;
    finishedAt: Date | null;
    errorMessage: string | null;
    durationMs: number | null;
  } | null;
  stats: {
    totalIndexed: number;
  };
  resources: {
    total: number;
  };
  syncHistory: {
    total: number;
  };
  syncJobs: {
    full: SyncJobInfo | null;
    incremental: SyncJobInfo | null;
  };
  webhookStatus: {
    enabled: boolean;
    lastReceivedAt: Date | null;
    configured: boolean;
  };
}

/**
 * Get sync status for a connector
 */
export const getSyncStatus = async (
  db: Database,
  connectorId: string
): Promise<GetSyncStatusResult | null> => {
  // Get connector with latest sync info and webhook config
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: {
      id: true,
      status: true,
      lastSyncedAt: true,
      lastSyncStatus: true,
      lastError: true,
      lastErrorAt: true,
      webhookConfig: true,
    },
  });

  if (!connector) {
    return null;
  }

  // Get latest sync history
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
    },
  });

  // Get counts in parallel
  const [totalIndexed, totalResources, totalSyncHistory] = await Promise.all([
    db.indexedDocument.count({ where: { connectorId } }),
    db.connectorResource.count({ where: { connectorId } }),
    db.syncHistory.count({ where: { connectorId } }),
  ]);

  // Get sync jobs for this connector
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

  // Separate full and incremental sync jobs
  const fullSyncJob = syncJobs.find((job) => job.type === "FULL");
  const incrementalSyncJob = syncJobs.find((job) => job.type === "INCREMENTAL");

  // Parse webhook config
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
    },
    latestSync,
    stats: {
      totalIndexed,
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

export interface GetSyncHistoryResult {
  connectorId: string;
  history: Array<{
    id: string;
    status: string;
    dataAdded: number;
    dataUpdated: number;
    dataDeleted: number;
    errorMessage: string | null;
    summary: Prisma.JsonValue;
    startedAt: Date;
    finishedAt: Date | null;
    durationMs: number | null;
    syncJob: {
      type: string;
      trigger: string;
    } | null;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Get sync history for a connector with pagination
 */
export const getSyncHistory = async (
  db: Database,
  connectorId: string,
  options: { limit: number; offset: number }
): Promise<GetSyncHistoryResult> => {
  // Fetch sync history with pagination
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
    history,
    pagination: {
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total,
    },
  };
};

/**
 * Verify connector belongs to team
 */
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

export interface ScheduledSyncJob {
  id: string;
  connectorId: string;
  type: string;
  schedule: string | null;
  priority: number;
  config: unknown;
}

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
