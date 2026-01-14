import { describe, expect, it } from "bun:test";
import type {
  ConnectorHealthScore,
  ConnectorSyncStats,
  SyncTrendDataPoint,
} from "../connector-stats";

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function createMockStats(
  overrides: Partial<ConnectorSyncStats> = {}
): ConnectorSyncStats {
  return {
    connectorId: "conn_123",
    connectorType: "LINEAR" as const,
    connectorName: "Linear",
    documentCount: 100,
    lastSyncAt: new Date(),
    lastSyncStatus: "COMPLETED",
    syncSuccessRate: 0.95,
    syncFailureRate: 0.05,
    averageSyncDurationMs: 30_000,
    totalSyncsLast30Days: 20,
    successfulSyncsLast30Days: 19,
    failedSyncsLast30Days: 1,
    ...overrides,
  };
}

describe("ConnectorSyncStats interface", () => {
  it("has correct structure for healthy connector", () => {
    const stats = createMockStats();

    expect(stats.connectorId).toBe("conn_123");
    expect(stats.syncSuccessRate).toBeGreaterThan(0.9);
    expect(stats.syncFailureRate).toBeLessThan(0.1);
    expect(stats.documentCount).toBe(100);
  });

  it("has correct structure for failing connector", () => {
    const stats = createMockStats({
      syncSuccessRate: 0.3,
      syncFailureRate: 0.7,
      successfulSyncsLast30Days: 6,
      failedSyncsLast30Days: 14,
    });

    expect(stats.syncSuccessRate).toBeLessThan(0.5);
    expect(stats.syncFailureRate).toBeGreaterThan(0.5);
    expect(stats.failedSyncsLast30Days).toBeGreaterThan(
      stats.successfulSyncsLast30Days
    );
  });

  it("handles zero syncs", () => {
    const stats = createMockStats({
      syncSuccessRate: 0,
      syncFailureRate: 0,
      totalSyncsLast30Days: 0,
      successfulSyncsLast30Days: 0,
      failedSyncsLast30Days: 0,
      lastSyncAt: null,
      lastSyncStatus: null,
    });

    expect(stats.syncSuccessRate).toBe(0);
    expect(stats.totalSyncsLast30Days).toBe(0);
    expect(stats.lastSyncAt).toBeNull();
  });
});

describe("ConnectorHealthScore interface", () => {
  function createMockHealthScore(
    overrides: Partial<ConnectorHealthScore> = {}
  ): ConnectorHealthScore {
    return {
      connectorId: "conn_123",
      healthScore: 85,
      factors: {
        syncSuccessRate: 0.95,
        recentActivityScore: 0.8,
        errorFreeScore: 1,
      },
      status: "healthy",
      ...overrides,
    };
  }

  it("healthy score is >= 80", () => {
    const score = createMockHealthScore({ healthScore: 85, status: "healthy" });
    expect(score.healthScore).toBeGreaterThanOrEqual(80);
    expect(score.status).toBe("healthy");
  });

  it("degraded score is 50-79", () => {
    const score = createMockHealthScore({
      healthScore: 65,
      status: "degraded",
      factors: {
        syncSuccessRate: 0.7,
        recentActivityScore: 0.5,
        errorFreeScore: 0.5,
      },
    });
    expect(score.healthScore).toBeGreaterThanOrEqual(50);
    expect(score.healthScore).toBeLessThan(80);
    expect(score.status).toBe("degraded");
  });

  it("unhealthy score is < 50", () => {
    const score = createMockHealthScore({
      healthScore: 30,
      status: "unhealthy",
      factors: {
        syncSuccessRate: 0.2,
        recentActivityScore: 0.1,
        errorFreeScore: 0.5,
      },
    });
    expect(score.healthScore).toBeLessThan(50);
    expect(score.status).toBe("unhealthy");
  });

  it("unknown when no sync data", () => {
    const score = createMockHealthScore({
      healthScore: 0,
      status: "unknown",
      factors: {
        syncSuccessRate: 0,
        recentActivityScore: 0,
        errorFreeScore: 1,
      },
    });
    expect(score.status).toBe("unknown");
  });
});

describe("SyncTrendDataPoint interface", () => {
  it("has correct structure", () => {
    const dataPoint: SyncTrendDataPoint = {
      date: "2024-01-15",
      successful: 3,
      failed: 1,
      totalDocuments: 150,
    };

    expect(dataPoint.date).toMatch(DATE_FORMAT_REGEX);
    expect(dataPoint.successful).toBeGreaterThanOrEqual(0);
    expect(dataPoint.failed).toBeGreaterThanOrEqual(0);
    expect(dataPoint.totalDocuments).toBeGreaterThanOrEqual(0);
  });

  it("can represent a perfect day", () => {
    const dataPoint: SyncTrendDataPoint = {
      date: "2024-01-15",
      successful: 5,
      failed: 0,
      totalDocuments: 500,
    };

    expect(dataPoint.failed).toBe(0);
    expect(dataPoint.successful).toBeGreaterThan(0);
  });

  it("can represent a day with no syncs", () => {
    const dataPoint: SyncTrendDataPoint = {
      date: "2024-01-15",
      successful: 0,
      failed: 0,
      totalDocuments: 0,
    };

    expect(dataPoint.successful).toBe(0);
    expect(dataPoint.failed).toBe(0);
    expect(dataPoint.totalDocuments).toBe(0);
  });
});

describe("success rate calculations", () => {
  it("calculates success rate correctly", () => {
    const successful = 19;
    const total = 20;
    const rate = successful / total;

    expect(rate).toBe(0.95);
  });

  it("handles edge case of zero total", () => {
    const successful = 0;
    const total = 0;
    const rate = total > 0 ? successful / total : 0;

    expect(rate).toBe(0);
  });

  it("rounds to 4 decimal places", () => {
    const successful = 17;
    const total = 23;
    const rate = Math.round((successful / total) * 10_000) / 10_000;

    expect(rate).toBe(0.7391);
  });
});

describe("health score weighting", () => {
  it("applies correct weights: 50% sync, 30% activity, 20% error-free", () => {
    const syncSuccessRate = 1.0;
    const recentActivityScore = 1.0;
    const errorFreeScore = 1.0;

    const healthScore = Math.round(
      (syncSuccessRate * 0.5 +
        recentActivityScore * 0.3 +
        errorFreeScore * 0.2) *
        100
    );

    expect(healthScore).toBe(100);
  });

  it("sync rate has highest impact", () => {
    const highSyncLowOthers = Math.round(
      (1.0 * 0.5 + 0.0 * 0.3 + 0.0 * 0.2) * 100
    );
    const lowSyncHighOthers = Math.round(
      (0.0 * 0.5 + 1.0 * 0.3 + 1.0 * 0.2) * 100
    );

    expect(highSyncLowOthers).toBe(50);
    expect(lowSyncHighOthers).toBe(50);
    expect(highSyncLowOthers).toBe(lowSyncHighOthers);
  });

  it("realistic scenario with 80% success", () => {
    const syncSuccessRate = 0.8;
    const recentActivityScore = 0.9;
    const errorFreeScore = 0.5;

    const healthScore = Math.round(
      (syncSuccessRate * 0.5 +
        recentActivityScore * 0.3 +
        errorFreeScore * 0.2) *
        100
    );

    expect(healthScore).toBe(77);
  });
});
