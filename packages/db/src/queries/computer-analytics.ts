import type { Database } from "../index";

export function getComputerMetrics(
  db: Database,
  teamId: string,
  sinceDaysAgo = 7
) {
  const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000);

  return db.computerRun.groupBy({
    by: ["status"],
    where: { teamId, createdAt: { gte: since } },
    _count: true,
    _avg: { toolCallCount: true, llmCallCount: true },
  });
}

export function getComputerRunsByAgent(
  db: Database,
  teamId: string,
  sinceDaysAgo = 7
) {
  const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000);

  return db.computerRun.groupBy({
    by: ["agentId"],
    where: { teamId, createdAt: { gte: since } },
    _count: true,
  });
}

export async function getAgentDriftBaseline(
  db: Database,
  agentId: string,
  baselineRunCount = 20
) {
  const runs = await db.computerRun.findMany({
    where: { agentId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: baselineRunCount,
    select: {
      toolCallCount: true,
      llmCallCount: true,
      startedAt: true,
      completedAt: true,
    },
  });

  if (runs.length === 0) {
    return null;
  }

  const durations = runs
    .filter((r) => r.startedAt && r.completedAt)
    .map(
      (r) =>
        new Date(r.completedAt as Date).getTime() -
        new Date(r.startedAt as Date).getTime()
    );

  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  const avgToolCalls =
    runs.reduce((a, r) => a + r.toolCallCount, 0) / runs.length;

  const avgLlmCalls =
    runs.reduce((a, r) => a + r.llmCallCount, 0) / runs.length;

  return {
    runCount: runs.length,
    avgDurationMs: Math.round(avgDuration),
    avgToolCalls: Math.round(avgToolCalls * 10) / 10,
    avgLlmCalls: Math.round(avgLlmCalls * 10) / 10,
  };
}

export async function detectAgentDrift(db: Database, agentId: string) {
  const baseline = await getAgentDriftBaseline(db, agentId);
  if (!baseline || baseline.runCount < 5) {
    return [];
  }

  const recent = await db.computerRun.findMany({
    where: { agentId, status: { in: ["COMPLETED", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      status: true,
      toolCallCount: true,
      llmCallCount: true,
      startedAt: true,
      completedAt: true,
    },
  });

  const signals: Array<{
    signal: string;
    severity: "info" | "warning" | "critical";
    baseline: number;
    current: number;
  }> = [];

  const recentDurations = recent
    .filter((r) => r.startedAt && r.completedAt)
    .map(
      (r) =>
        new Date(r.completedAt as Date).getTime() -
        new Date(r.startedAt as Date).getTime()
    );

  const avgRecentDuration =
    recentDurations.length > 0
      ? recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length
      : 0;

  if (avgRecentDuration > baseline.avgDurationMs * 2) {
    signals.push({
      signal: "duration_spike",
      severity: "warning",
      baseline: baseline.avgDurationMs,
      current: Math.round(avgRecentDuration),
    });
  }

  const recentErrorRate =
    recent.filter((r) => r.status === "FAILED").length / recent.length;

  if (recentErrorRate > 0.4) {
    signals.push({
      signal: "error_increase",
      severity: "critical",
      baseline: 0,
      current: Math.round(recentErrorRate * 100),
    });
  }

  const avgRecentToolCalls =
    recent.reduce((a, r) => a + r.toolCallCount, 0) / recent.length;

  if (avgRecentToolCalls > baseline.avgToolCalls * 1.5) {
    signals.push({
      signal: "tool_call_spike",
      severity: "info",
      baseline: baseline.avgToolCalls,
      current: Math.round(avgRecentToolCalls * 10) / 10,
    });
  }

  return signals;
}
