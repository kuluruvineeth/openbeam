import type { Database } from "@openbeam/db";

const PLAN_LIMITS = {
  free: { maxAgents: 2, maxRunsPerMonth: 50, maxConcurrentRuns: 1 },
  starter: { maxAgents: 5, maxRunsPerMonth: 500, maxConcurrentRuns: 3 },
  pro: { maxAgents: 25, maxRunsPerMonth: 5000, maxConcurrentRuns: 10 },
  enterprise: {
    maxAgents: 100,
    maxRunsPerMonth: 50_000,
    maxConcurrentRuns: 50,
  },
} as const;

type PlanTier = keyof typeof PLAN_LIMITS;

function getPlanLimits(tier: string) {
  return PLAN_LIMITS[tier as PlanTier] ?? PLAN_LIMITS.free;
}

export async function checkAgentQuota(
  db: Database,
  teamId: string,
  planTier: string
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = getPlanLimits(planTier);
  const agentCount = await db.computerAgent.count({
    where: { teamId, status: { not: "ARCHIVED" } },
  });

  if (agentCount >= limits.maxAgents) {
    return {
      allowed: false,
      reason: `Agent limit reached (${limits.maxAgents}). Upgrade to add more.`,
    };
  }

  return { allowed: true };
}

export async function checkRunQuota(
  db: Database,
  teamId: string,
  planTier: string
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = getPlanLimits(planTier);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyRuns = await db.computerRun.count({
    where: { teamId, createdAt: { gte: monthStart } },
  });

  if (monthlyRuns >= limits.maxRunsPerMonth) {
    return {
      allowed: false,
      reason: `Monthly run limit reached (${limits.maxRunsPerMonth}).`,
    };
  }

  const activeRuns = await db.computerRun.count({
    where: { teamId, status: "RUNNING" },
  });

  if (activeRuns >= limits.maxConcurrentRuns) {
    return {
      allowed: false,
      reason: `Concurrent run limit reached (${limits.maxConcurrentRuns}).`,
    };
  }

  return { allowed: true };
}

const MODEL_COSTS_PER_MILLION = {
  "claude-haiku-4-5": { input: 0.8, output: 4.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
} as const;

type ModelId = keyof typeof MODEL_COSTS_PER_MILLION;

export function estimateRunCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates =
    MODEL_COSTS_PER_MILLION[model as ModelId] ??
    MODEL_COSTS_PER_MILLION["claude-haiku-4-5"];

  return (
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  );
}

export async function getMonthlyUsage(
  db: Database,
  teamId: string
): Promise<{
  runCount: number;
  agentCount: number;
  totalToolCalls: number;
  totalLlmCalls: number;
}> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [runStats, agentCount] = await Promise.all([
    db.computerRun.aggregate({
      where: { teamId, createdAt: { gte: monthStart } },
      _count: true,
      _sum: { toolCallCount: true, llmCallCount: true },
    }),
    db.computerAgent.count({
      where: { teamId, status: { not: "ARCHIVED" } },
    }),
  ]);

  return {
    runCount: runStats._count,
    agentCount,
    totalToolCalls: runStats._sum.toolCallCount ?? 0,
    totalLlmCalls: runStats._sum.llmCallCount ?? 0,
  };
}
