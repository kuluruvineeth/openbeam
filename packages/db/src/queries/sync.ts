/**
 * Sync Queries
 * Enhanced sync queries matching sync.prisma schema
 */

import type {
  Prisma,
  SyncCursor,
  SyncJob,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Sync Status Queries
// ============================================================================

/**
 * Get sync status for a connector
 */
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
    },
  });

  const totalIndexed = await db.indexedDocument.count({
    where: { connectorId },
  });

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

  const webhookConfig = connector.webhookConfig as {
    enabled?: boolean;
    lastReceivedAt?: string;
    url?: string;
  } | null;

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
    stats: { totalIndexed },
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

/**
 * Get sync history for a connector
 */
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
          select: { type: true, trigger: true },
        },
      },
    }),
    db.syncHistory.count({ where: { connectorId } }),
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

// ============================================================================
// Sync Job Queries
// ============================================================================

/**
 * Get sync job by ID
 */
export const getSyncJobById = (
  db: Database,
  syncJobId: string
): Promise<SyncJob | null> =>
  db.syncJob.findUnique({ where: { id: syncJobId } });

/**
 * Get active sync jobs for connector
 */
export const getActiveSyncJobs = (
  db: Database,
  connectorId: string
): Promise<SyncJob[]> =>
  db.syncJob.findMany({
    where: {
      connectorId,
      deletedAt: null,
      status: { in: ["PENDING", "QUEUED", "RUNNING"] },
    },
    orderBy: { priority: "desc" },
  });

/**
 * Get scheduled sync jobs for connector
 */
export const getScheduledSyncJobs = (
  db: Database,
  connectorId: string
): Promise<SyncJob[]> =>
  db.syncJob.findMany({
    where: { connectorId, deletedAt: null, trigger: "SCHEDULED" },
  });

/**
 * Get running sync job for connector (to prevent duplicates)
 */
export const getRunningSync = (
  db: Database,
  connectorId: string
): Promise<SyncJob | null> =>
  db.syncJob.findFirst({
    where: { connectorId, status: "RUNNING", deletedAt: null },
  });

// ============================================================================
// Sync Cursor Queries
// ============================================================================

/**
 * Get sync cursor for a resource
 */
export const getSyncCursor = (
  db: Database,
  connectorId: string,
  resource: string
): Promise<SyncCursor | null> =>
  db.syncCursor.findUnique({
    where: { connectorId_resource: { connectorId, resource } },
  });

/**
 * Get all sync cursors for connector
 */
export const getSyncCursors = (
  db: Database,
  connectorId: string
): Promise<SyncCursor[]> =>
  db.syncCursor.findMany({
    where: { connectorId },
    orderBy: { resource: "asc" },
  });

// ============================================================================
// Indexed Document Queries
// ============================================================================

/**
 * Get indexed document count by type
 */
export const getIndexedDocumentStats = async (
  db: Database,
  connectorId: string
): Promise<Record<string, number>> => {
  const counts = await db.indexedDocument.groupBy({
    by: ["documentType"],
    where: { connectorId, deletedFromSource: false },
    _count: { documentType: true },
  });

  return counts.reduce(
    (acc, count) => {
      acc[count.documentType] = count._count.documentType;
      return acc;
    },
    {} as Record<string, number>
  );
};

/**
 * Get recently synced documents
 */
export const getRecentlySyncedDocuments = (
  db: Database,
  connectorId: string,
  limit = 20
) =>
  db.indexedDocument.findMany({
    where: { connectorId, deletedFromSource: false },
    orderBy: { lastSyncedAt: "desc" },
    take: limit,
    select: {
      id: true,
      externalId: true,
      documentType: true,
      title: true,
      lastSyncedAt: true,
    },
  });

/**
 * Check if document exists by external ID
 */
export const documentExistsByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<boolean> => {
  const count = await db.indexedDocument.count({
    where: { connectorId, externalId },
  });
  return count > 0;
};

/**
 * Get document by external ID
 */
export const getDocumentByExternalId = (
  db: Database,
  connectorId: string,
  externalId: string
) =>
  db.indexedDocument.findUnique({
    where: { connectorId_externalId: { connectorId, externalId } },
  });
