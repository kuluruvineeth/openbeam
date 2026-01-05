import type { AIUsageGranularity } from "../../prisma/generated/enums";
import type { Database } from "../index";

export async function getTeamUsageSummary(
  db: Database,
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  const [logs, summaries, toolUsage] = await Promise.all([
    db.aIUsageLog.aggregate({
      where: {
        teamId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
        totalCostUsd: true,
      },
      _count: true,
      _avg: {
        latencyMs: true,
      },
    }),
    db.aIUsageSummary.findMany({
      where: {
        teamId,
        periodStart: { gte: startDate },
        periodEnd: { lte: endDate },
      },
      orderBy: { periodStart: "desc" },
      take: 30,
    }),
    db.aIToolUsage.groupBy({
      by: ["toolName", "category"],
      where: {
        teamId,
        periodStart: { gte: startDate },
        periodEnd: { lte: endDate },
      },
      _sum: {
        callCount: true,
        successCount: true,
        failureCount: true,
      },
      _avg: {
        avgLatencyMs: true,
      },
    }),
  ]);

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totals: {
      requests: logs._count,
      inputTokens: logs._sum.inputTokens ?? 0,
      outputTokens: logs._sum.outputTokens ?? 0,
      cacheTokens:
        (logs._sum.cacheReadTokens ?? 0) + (logs._sum.cacheWriteTokens ?? 0),
      totalCostUsd: logs._sum.totalCostUsd ?? 0,
      avgLatencyMs: logs._avg.latencyMs ?? 0,
    },
    dailySummaries: summaries.map((s) => ({
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      requests: s.totalRequests,
      successfulRequests: s.successfulRequests,
      failedRequests: s.failedRequests,
      inputTokens: Number(s.totalInputTokens),
      outputTokens: Number(s.totalOutputTokens),
      totalCostUsd: s.totalCostUsd,
      avgLatencyMs: s.avgLatencyMs,
      costByProvider: s.costByProvider as Record<string, number>,
      costByModel: s.costByModel as Record<string, number>,
    })),
    toolUsage: toolUsage.map((t) => ({
      toolName: t.toolName,
      category: t.category,
      callCount: t._sum.callCount ?? 0,
      successCount: t._sum.successCount ?? 0,
      failureCount: t._sum.failureCount ?? 0,
      avgLatencyMs: t._avg.avgLatencyMs ?? 0,
    })),
  };
}

export function getTeamUsageLogs(
  db: Database,
  teamId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    provider?: string;
    model?: string;
    workflow?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    startDate,
    endDate,
    provider,
    model,
    workflow,
    limit = 100,
    offset = 0,
  } = options;

  return db.aIUsageLog.findMany({
    where: {
      teamId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      provider: provider ?? undefined,
      model: model ?? undefined,
      workflow: workflow ?? undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getAIUsageSummaries(
  db: Database,
  teamId: string,
  options: {
    granularity: AIUsageGranularity;
    startDate: Date;
    endDate: Date;
  }
) {
  return db.aIUsageSummary.findMany({
    where: {
      teamId,
      granularity: options.granularity,
      periodStart: { gte: options.startDate },
      periodEnd: { lte: options.endDate },
    },
    orderBy: { periodStart: "asc" },
  });
}

export function getAICacheMetrics(
  db: Database,
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  return db.aICacheMetrics.findMany({
    where: {
      teamId,
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
    },
    orderBy: { periodStart: "desc" },
  });
}

export function getToolUsageStats(
  db: Database,
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  return db.aIToolUsage.findMany({
    where: {
      teamId,
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
    },
    orderBy: { callCount: "desc" },
  });
}

export interface BillingUsageSummary {
  periodStart: Date;
  periodEnd: Date;
  totalRequests: number;
  totalInputTokens: bigint;
  totalOutputTokens: bigint;
  totalCacheTokens: bigint;
  totalCostUsd: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
}

export async function getTeamBillingUsage(
  db: Database,
  teamId: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): Promise<BillingUsageSummary> {
  const logs = await db.aIUsageLog.aggregate({
    where: {
      teamId,
      createdAt: {
        gte: billingPeriodStart,
        lt: billingPeriodEnd,
      },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: true,
      cacheWriteTokens: true,
      totalCostUsd: true,
    },
    _count: true,
  });

  const costByProvider = await db.aIUsageLog.groupBy({
    by: ["provider"],
    where: {
      teamId,
      createdAt: {
        gte: billingPeriodStart,
        lt: billingPeriodEnd,
      },
    },
    _sum: { totalCostUsd: true },
  });

  const costByModel = await db.aIUsageLog.groupBy({
    by: ["model"],
    where: {
      teamId,
      createdAt: {
        gte: billingPeriodStart,
        lt: billingPeriodEnd,
      },
    },
    _sum: { totalCostUsd: true },
  });

  return {
    periodStart: billingPeriodStart,
    periodEnd: billingPeriodEnd,
    totalRequests: logs._count,
    totalInputTokens: BigInt(logs._sum.inputTokens ?? 0),
    totalOutputTokens: BigInt(logs._sum.outputTokens ?? 0),
    totalCacheTokens: BigInt(
      (logs._sum.cacheReadTokens ?? 0) + (logs._sum.cacheWriteTokens ?? 0)
    ),
    totalCostUsd: logs._sum.totalCostUsd ?? 0,
    costByProvider: Object.fromEntries(
      costByProvider.map((p) => [p.provider, p._sum.totalCostUsd ?? 0])
    ),
    costByModel: Object.fromEntries(
      costByModel.map((m) => [m.model, m._sum.totalCostUsd ?? 0])
    ),
  };
}

export async function getMonthlyUsageTotals(
  db: Database,
  teamId: string,
  year: number,
  month: number
): Promise<BillingUsageSummary> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);
  const result = await getTeamBillingUsage(db, teamId, periodStart, periodEnd);
  return result;
}

export async function getUsageByUser(
  db: Database,
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  const result = await db.aIUsageLog.groupBy({
    by: ["userId"],
    where: {
      teamId,
      userId: { not: null },
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalCostUsd: true,
    },
    _count: true,
  });
  return result;
}

export async function getUsageByWorkflow(
  db: Database,
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  const result = await db.aIUsageLog.groupBy({
    by: ["workflow"],
    where: {
      teamId,
      workflow: { not: null },
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalCostUsd: true,
    },
    _count: true,
    orderBy: { _sum: { totalCostUsd: "desc" } },
  });
  return result;
}

export interface TopCostDriversOptions {
  teamId: string;
  startDate: Date;
  endDate: Date;
  limit?: number;
}

export async function getTopCostDrivers(
  db: Database,
  options: TopCostDriversOptions
) {
  const { teamId, startDate, endDate, limit = 10 } = options;
  const [byModel, byWorkflow, byUser] = await Promise.all([
    db.aIUsageLog.groupBy({
      by: ["provider", "model"],
      where: {
        teamId,
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: { totalCostUsd: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
      take: limit,
    }),
    db.aIUsageLog.groupBy({
      by: ["workflow"],
      where: {
        teamId,
        workflow: { not: null },
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: { totalCostUsd: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
      take: limit,
    }),
    db.aIUsageLog.groupBy({
      by: ["userId"],
      where: {
        teamId,
        userId: { not: null },
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: { totalCostUsd: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
      take: limit,
    }),
  ]);

  return {
    byModel: byModel.map((m) => ({
      provider: m.provider,
      model: m.model,
      costUsd: m._sum.totalCostUsd ?? 0,
    })),
    byWorkflow: byWorkflow.map((w) => ({
      workflow: w.workflow,
      costUsd: w._sum.totalCostUsd ?? 0,
    })),
    byUser: byUser.map((u) => ({
      userId: u.userId,
      costUsd: u._sum.totalCostUsd ?? 0,
    })),
  };
}

export async function getDailyUsageForPeriod(
  db: Database,
  teamId: string,
  startDate: Date,
  endDate: Date
) {
  const summaries = await db.aIUsageSummary.findMany({
    where: {
      teamId,
      granularity: "DAY",
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
    },
    orderBy: { periodStart: "asc" },
    select: {
      periodStart: true,
      periodEnd: true,
      totalRequests: true,
      totalInputTokens: true,
      totalOutputTokens: true,
      totalCostUsd: true,
    },
  });

  return summaries.map((s) => ({
    date: s.periodStart.toISOString().split("T")[0],
    requests: s.totalRequests,
    inputTokens: Number(s.totalInputTokens),
    outputTokens: Number(s.totalOutputTokens),
    costUsd: s.totalCostUsd,
  }));
}

export interface AIUsageLogForExport {
  id: string;
  teamId: string;
  userId: string | null;
  traceId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  cacheCostUsd: number;
  totalCostUsd: number;
  latencyMs: number;
  firstTokenMs: number | null;
  workflow: string | null;
  feature: string | null;
  operation: string | null;
  success: boolean;
  errorCode: string | null;
  createdAt: Date;
}

export async function getAIUsageLogsForExport(
  db: Database,
  teamId: string,
  date: string
): Promise<AIUsageLogForExport[]> {
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const logs = await db.aIUsageLog.findMany({
    where: {
      teamId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      traceId: true,
      provider: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: true,
      cacheWriteTokens: true,
      reasoningTokens: true,
      inputCostUsd: true,
      outputCostUsd: true,
      cacheCostUsd: true,
      totalCostUsd: true,
      latencyMs: true,
      firstTokenMs: true,
      workflow: true,
      feature: true,
      operation: true,
      success: true,
      errorCode: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return logs;
}

export async function countAIUsageLogsForDate(
  db: Database,
  teamId: string,
  date: string
): Promise<number> {
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const count = await db.aIUsageLog.count({
    where: {
      teamId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return count;
}

export async function getTeamsWithAIUsageForDate(
  db: Database,
  date: string
): Promise<string[]> {
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay = new Date(`${date}T23:59:59.999Z`);

  const teams = await db.aIUsageLog.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: { teamId: true },
    distinct: ["teamId"],
  });

  return teams.map((t) => t.teamId);
}
