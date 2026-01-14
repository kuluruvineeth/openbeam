import type { AppType } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface ConnectorSyncStats {
  connectorId: string;
  connectorType: AppType;
  connectorName: string;
  documentCount: number;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  syncSuccessRate: number;
  syncFailureRate: number;
  averageSyncDurationMs: number;
  totalSyncsLast30Days: number;
  successfulSyncsLast30Days: number;
  failedSyncsLast30Days: number;
}

export interface ConnectorStatsQueryOptions {
  includeDisabled?: boolean;
  syncHistoryDays?: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getConnectorStats(
  db: Database,
  connectorId: string,
  teamId: string,
  options: ConnectorStatsQueryOptions = {}
): Promise<ConnectorSyncStats | null> {
  const syncHistoryDays = options.syncHistoryDays ?? 30;
  const cutoffDate = new Date(
    Date.now() - syncHistoryDays * 24 * 60 * 60 * 1000
  );

  const connector = await db.connector.findFirst({
    where: { id: connectorId, teamId },
    include: {
      _count: { select: { indexedDocuments: true } },
      syncHistory: {
        where: { startedAt: { gte: cutoffDate } },
        orderBy: { startedAt: "desc" },
        select: {
          status: true,
          startedAt: true,
          finishedAt: true,
          durationMs: true,
        },
      },
    },
  });

  if (!connector) {
    return null;
  }

  const completedSyncs = connector.syncHistory.filter(
    (h) => h.status === "COMPLETED" || h.status === "FAILED"
  );
  const successfulSyncs = connector.syncHistory.filter(
    (h) => h.status === "COMPLETED"
  );
  const failedSyncs = connector.syncHistory.filter(
    (h) => h.status === "FAILED"
  );

  const syncsWithDuration = completedSyncs.filter((h) => h.durationMs !== null);
  const totalDurationMs = syncsWithDuration.reduce(
    (sum, h) => sum + (h.durationMs ?? 0),
    0
  );
  const avgDurationMs =
    syncsWithDuration.length > 0
      ? totalDurationMs / syncsWithDuration.length
      : 0;

  const totalSyncs = completedSyncs.length;
  const successRate = totalSyncs > 0 ? successfulSyncs.length / totalSyncs : 0;
  const failureRate = totalSyncs > 0 ? failedSyncs.length / totalSyncs : 0;

  const lastSync = connector.syncHistory[0];

  return {
    connectorId: connector.id,
    connectorType: connector.app,
    connectorName: connector.name,
    documentCount: connector._count.indexedDocuments,
    lastSyncAt: lastSync?.startedAt ?? null,
    lastSyncStatus: lastSync?.status ?? null,
    syncSuccessRate: Math.round(successRate * 10_000) / 10_000,
    syncFailureRate: Math.round(failureRate * 10_000) / 10_000,
    averageSyncDurationMs: Math.round(avgDurationMs),
    totalSyncsLast30Days: totalSyncs,
    successfulSyncsLast30Days: successfulSyncs.length,
    failedSyncsLast30Days: failedSyncs.length,
  };
}

export interface TeamConnectorsSummary {
  totalConnectors: number;
  activeConnectors: number;
  failingConnectors: number;
  totalDocuments: number;
  averageSuccessRate: number;
  connectorsByType: Map<AppType, number>;
}

export async function getTeamConnectorsSummary(
  db: Database,
  teamId: string
): Promise<TeamConnectorsSummary> {
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

  const connectors = await db.connector.findMany({
    where: { teamId },
    include: {
      _count: { select: { indexedDocuments: true } },
      syncHistory: {
        where: { startedAt: { gte: thirtyDaysAgo } },
        select: { status: true },
      },
    },
  });

  const connectorsByType = new Map<AppType, number>();
  let totalDocuments = 0;
  let failingConnectors = 0;
  let activeConnectors = 0;
  let totalSuccessRate = 0;
  let connectorsWithSyncs = 0;

  for (const connector of connectors) {
    connectorsByType.set(
      connector.app,
      (connectorsByType.get(connector.app) ?? 0) + 1
    );

    totalDocuments += connector._count.indexedDocuments;

    const isActive =
      connector.status === "ACTIVE" || connector.status === "SYNCING";
    if (isActive) {
      activeConnectors += 1;
    }

    const completedSyncs = connector.syncHistory.filter(
      (h) => h.status === "COMPLETED" || h.status === "FAILED"
    );
    const successfulSyncs = connector.syncHistory.filter(
      (h) => h.status === "COMPLETED"
    );

    if (completedSyncs.length > 0) {
      const successRate = successfulSyncs.length / completedSyncs.length;
      totalSuccessRate += successRate;
      connectorsWithSyncs += 1;

      if (successRate < 0.5) {
        failingConnectors += 1;
      }
    }
  }

  const averageSuccessRate =
    connectorsWithSyncs > 0 ? totalSuccessRate / connectorsWithSyncs : 0;

  return {
    totalConnectors: connectors.length,
    activeConnectors,
    failingConnectors,
    totalDocuments,
    averageSuccessRate: Math.round(averageSuccessRate * 10_000) / 10_000,
    connectorsByType,
  };
}

export interface SyncTrendDataPoint {
  date: string;
  successful: number;
  failed: number;
  totalDocuments: number;
}

export async function getConnectorSyncTrend(
  db: Database,
  connectorId: string,
  teamId: string,
  days = 14
): Promise<SyncTrendDataPoint[]> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const connector = await db.connector.findFirst({
    where: { id: connectorId, teamId },
    select: { id: true },
  });

  if (!connector) {
    return [];
  }

  const history = await db.syncHistory.findMany({
    where: {
      connectorId,
      startedAt: { gte: cutoffDate },
      status: { in: ["COMPLETED", "FAILED"] },
    },
    select: {
      status: true,
      startedAt: true,
      dataAdded: true,
    },
    orderBy: { startedAt: "asc" },
  });

  const trendByDate = new Map<
    string,
    { successful: number; failed: number; totalDocuments: number }
  >();

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateParts = date.toISOString().split("T");
    const dateKey = dateParts[0] ?? "";
    trendByDate.set(dateKey, { successful: 0, failed: 0, totalDocuments: 0 });
  }

  for (const entry of history) {
    const entryParts = entry.startedAt.toISOString().split("T");
    const dateKey = entryParts[0] ?? "";
    const existing = trendByDate.get(dateKey);

    if (existing) {
      if (entry.status === "COMPLETED") {
        existing.successful += 1;
        existing.totalDocuments += entry.dataAdded ?? 0;
      } else {
        existing.failed += 1;
      }
    }
  }

  const result: SyncTrendDataPoint[] = Array.from(trendByDate.entries()).map(
    ([date, data]) => ({ date, ...data })
  );

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export interface ConnectorHealthScore {
  connectorId: string;
  healthScore: number;
  factors: {
    syncSuccessRate: number;
    recentActivityScore: number;
    errorFreeScore: number;
  };
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
}

export async function calculateConnectorHealthScore(
  db: Database,
  connectorId: string,
  teamId: string
): Promise<ConnectorHealthScore | null> {
  const stats = await getConnectorStats(db, connectorId, teamId, {
    syncHistoryDays: 7,
  });

  if (!stats) {
    return null;
  }

  const syncSuccessRate = stats.syncSuccessRate;

  const daysSinceSync = stats.lastSyncAt
    ? (Date.now() - stats.lastSyncAt.getTime()) / (24 * 60 * 60 * 1000)
    : 30;
  const recentActivityScore = Math.max(0, 1 - daysSinceSync / 7);

  const errorFreeScore = stats.failedSyncsLast30Days === 0 ? 1 : 0.5;

  const healthScore = Math.round(
    (syncSuccessRate * 0.5 + recentActivityScore * 0.3 + errorFreeScore * 0.2) *
      100
  );

  let status: ConnectorHealthScore["status"] = "unknown";
  if (stats.totalSyncsLast30Days === 0) {
    status = "unknown";
  } else if (healthScore >= 80) {
    status = "healthy";
  } else if (healthScore >= 50) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  return {
    connectorId,
    healthScore,
    factors: {
      syncSuccessRate,
      recentActivityScore: Math.round(recentActivityScore * 100) / 100,
      errorFreeScore,
    },
    status,
  };
}
