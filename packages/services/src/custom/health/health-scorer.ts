import {
  type Database,
  getCustomConnectorByConnectorId,
  getRecentSyncRuns,
} from "@openbeam/db";
import { cache } from "@openbeam/redis";

const CACHE_TTL_SECONDS = 300;
const LOOKBACK_DAYS = 7;
const MAX_SCORE = 100;
const CONSECUTIVE_ERROR_PENALTY = 5;

export interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface HealthScore {
  score: number;
  status: "healthy" | "degraded" | "unhealthy";
  factors: HealthFactor[];
  lastSyncAt: Date | null;
  totalDocuments: number;
  consecutiveErrors: number;
}

function cacheKey(connectorId: string): string {
  return `custom-connector:health:${connectorId}`;
}

function statusFromScore(score: number): HealthScore["status"] {
  if (score >= 80) {
    return "healthy";
  }
  if (score >= 50) {
    return "degraded";
  }
  return "unhealthy";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeSuccessRateScore(
  total: number,
  successful: number
): { score: number; detail: string } {
  if (total === 0) {
    return { score: MAX_SCORE, detail: "No syncs yet" };
  }
  const rate = successful / total;
  const score = Math.round(rate * MAX_SCORE);
  return {
    score: clamp(score, 0, MAX_SCORE),
    detail: `${successful}/${total} syncs succeeded (${Math.round(rate * 100)}%)`,
  };
}

function computeFreshnessScore(
  lastSyncAt: Date | null,
  lastPushAt: Date | null
): { score: number; detail: string } {
  const latestActivity = lastSyncAt ?? lastPushAt;
  if (!latestActivity) {
    return { score: 50, detail: "No activity recorded" };
  }

  const hoursAgo = (Date.now() - latestActivity.getTime()) / (1000 * 60 * 60);

  if (hoursAgo < 1) {
    return { score: 100, detail: "Active within last hour" };
  }
  if (hoursAgo < 6) {
    return { score: 90, detail: "Active within 6 hours" };
  }
  if (hoursAgo < 24) {
    return { score: 75, detail: "Active within 24 hours" };
  }
  if (hoursAgo < 72) {
    return { score: 50, detail: "Active within 3 days" };
  }
  if (hoursAgo < 168) {
    return { score: 25, detail: "Active within 7 days" };
  }
  return { score: 10, detail: "No activity for over 7 days" };
}

function computeErrorTrendScore(consecutiveErrors: number): {
  score: number;
  detail: string;
} {
  if (consecutiveErrors === 0) {
    return { score: 100, detail: "No consecutive errors" };
  }
  const penalty = consecutiveErrors * CONSECUTIVE_ERROR_PENALTY;
  const score = clamp(MAX_SCORE - penalty, 0, MAX_SCORE);
  return {
    score,
    detail: `${consecutiveErrors} consecutive error${consecutiveErrors === 1 ? "" : "s"}`,
  };
}

export async function computeHealthScore(
  db: Database,
  connectorId: string
): Promise<HealthScore> {
  const definition = await getCustomConnectorByConnectorId(db, connectorId);
  if (!definition) {
    return {
      score: 0,
      status: "unhealthy",
      factors: [],
      lastSyncAt: null,
      totalDocuments: 0,
      consecutiveErrors: 0,
    };
  }

  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - LOOKBACK_DAYS);

  const recentRuns = await getRecentSyncRuns(db, definition.id, lookbackDate);

  const totalRuns = recentRuns.length;
  const successfulRuns = recentRuns.filter(
    (r) => r.status === "completed"
  ).length;

  const lastCompletedRun = recentRuns.find((r) => r.completedAt !== null);
  const lastSyncAt = lastCompletedRun?.completedAt ?? definition.lastPushAt;

  const successRate = computeSuccessRateScore(totalRuns, successfulRuns);
  const freshness = computeFreshnessScore(lastSyncAt, definition.lastPushAt);
  const errorTrend = computeErrorTrendScore(definition.consecutiveErrors);

  const factors: HealthFactor[] = [
    { name: "Success Rate", weight: 0.5, ...successRate },
    { name: "Freshness", weight: 0.3, ...freshness },
    { name: "Error Trend", weight: 0.2, ...errorTrend },
  ];

  const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const score = clamp(Math.round(weightedScore), 0, MAX_SCORE);

  return {
    score,
    status: statusFromScore(score),
    factors,
    lastSyncAt,
    totalDocuments: definition.totalDocuments,
    consecutiveErrors: definition.consecutiveErrors,
  };
}

export async function getHealthScore(
  db: Database,
  connectorId: string
): Promise<HealthScore> {
  const key = cacheKey(connectorId);

  const cached = await cache.get<HealthScore>(key);
  if (cached) {
    return cached;
  }

  const score = await computeHealthScore(db, connectorId);
  await cache.set(key, score, CACHE_TTL_SECONDS);
  return score;
}

export async function invalidateHealthCache(
  connectorId: string
): Promise<void> {
  await cache.del(cacheKey(connectorId));
}
