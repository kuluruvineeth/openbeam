import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

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
}

/**
 * Get sync status for a connector
 */
export const getSyncStatus = async (
  db: Database,
  connectorId: string
): Promise<GetSyncStatusResult | null> => {
  // Get connector with latest sync info
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: {
      id: true,
      status: true,
      lastSyncedAt: true,
      lastSyncStatus: true,
      lastError: true,
      lastErrorAt: true,
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

  // Get indexed document count
  const totalIndexed = await db.indexedDocument.count({
    where: { connectorId },
  });

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
 * Verify connector belongs to organization
 */
export const verifyConnectorOwnership = async (
  db: Database,
  connectorId: string,
  organizationId: string
): Promise<{ id: string; status: string; organizationId: string } | null> => {
  const connector = await db.connector.findUnique({
    where: { id: connectorId },
    select: { id: true, status: true, organizationId: true },
  });

  if (!connector || connector.organizationId !== organizationId) {
    return null;
  }

  return connector;
};
