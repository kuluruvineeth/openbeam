import type {
  AICacheMetrics,
  AIToolUsage,
  AIUsageGranularity,
  AIUsageLog,
  AIUsageSummary,
  Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateAIUsageLogInput {
  teamId: string;
  userId?: string;
  traceId: string;
  parentSpanId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  inputCostUsd: number;
  outputCostUsd: number;
  cacheCostUsd?: number;
  totalCostUsd: number;
  latencyMs: number;
  firstTokenMs?: number;
  workflow?: string;
  feature?: string;
  operation?: string;
  success?: boolean;
  errorCode?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createAIUsageLog(
  db: Database,
  data: CreateAIUsageLogInput
): Promise<AIUsageLog> {
  const log = await db.aIUsageLog.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      traceId: data.traceId,
      parentSpanId: data.parentSpanId,
      provider: data.provider,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cacheReadTokens: data.cacheReadTokens ?? 0,
      cacheWriteTokens: data.cacheWriteTokens ?? 0,
      reasoningTokens: data.reasoningTokens ?? 0,
      inputCostUsd: data.inputCostUsd,
      outputCostUsd: data.outputCostUsd,
      cacheCostUsd: data.cacheCostUsd ?? 0,
      totalCostUsd: data.totalCostUsd,
      latencyMs: data.latencyMs,
      firstTokenMs: data.firstTokenMs,
      workflow: data.workflow,
      feature: data.feature,
      operation: data.operation,
      success: data.success ?? true,
      errorCode: data.errorCode,
      metadata: data.metadata,
    },
  });
  return log;
}

export async function createAIUsageLogBatch(
  db: Database,
  logs: CreateAIUsageLogInput[]
): Promise<{ count: number }> {
  const result = await db.aIUsageLog.createMany({
    data: logs.map((data) => ({
      teamId: data.teamId,
      userId: data.userId,
      traceId: data.traceId,
      parentSpanId: data.parentSpanId,
      provider: data.provider,
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cacheReadTokens: data.cacheReadTokens ?? 0,
      cacheWriteTokens: data.cacheWriteTokens ?? 0,
      reasoningTokens: data.reasoningTokens ?? 0,
      inputCostUsd: data.inputCostUsd,
      outputCostUsd: data.outputCostUsd,
      cacheCostUsd: data.cacheCostUsd ?? 0,
      totalCostUsd: data.totalCostUsd,
      latencyMs: data.latencyMs,
      firstTokenMs: data.firstTokenMs,
      workflow: data.workflow,
      feature: data.feature,
      operation: data.operation,
      success: data.success ?? true,
      errorCode: data.errorCode,
      metadata: data.metadata,
    })),
    skipDuplicates: true,
  });
  return result;
}

export interface UpsertAIUsageSummaryInput {
  teamId: string;
  periodStart: Date;
  periodEnd: Date;
  granularity: AIUsageGranularity;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: bigint;
  totalOutputTokens: bigint;
  totalCacheTokens: bigint;
  totalCostUsd: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  costByWorkflow: Record<string, number>;
  costByUser: Record<string, number>;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export async function upsertAIUsageSummary(
  db: Database,
  data: UpsertAIUsageSummaryInput
): Promise<AIUsageSummary> {
  const summary = await db.aIUsageSummary.upsert({
    where: {
      teamId_periodStart_granularity: {
        teamId: data.teamId,
        periodStart: data.periodStart,
        granularity: data.granularity,
      },
    },
    create: data,
    update: {
      totalRequests: data.totalRequests,
      successfulRequests: data.successfulRequests,
      failedRequests: data.failedRequests,
      totalInputTokens: data.totalInputTokens,
      totalOutputTokens: data.totalOutputTokens,
      totalCacheTokens: data.totalCacheTokens,
      totalCostUsd: data.totalCostUsd,
      costByProvider: data.costByProvider,
      costByModel: data.costByModel,
      costByWorkflow: data.costByWorkflow,
      costByUser: data.costByUser,
      avgLatencyMs: data.avgLatencyMs,
      p50LatencyMs: data.p50LatencyMs,
      p95LatencyMs: data.p95LatencyMs,
      p99LatencyMs: data.p99LatencyMs,
    },
  });
  return summary;
}

export interface UpsertAICacheMetricsInput {
  teamId: string;
  periodStart: Date;
  periodEnd: Date;
  kvCacheHits: number;
  kvCacheMisses: number;
  kvCacheHitRate: number;
  toolCacheHits: number;
  toolCacheMisses: number;
  toolCacheHitRate: number;
  tokensSaved: bigint;
  costSavedUsd: number;
}

export async function upsertAICacheMetrics(
  db: Database,
  data: UpsertAICacheMetricsInput
): Promise<AICacheMetrics> {
  const metrics = await db.aICacheMetrics.upsert({
    where: {
      teamId_periodStart: {
        teamId: data.teamId,
        periodStart: data.periodStart,
      },
    },
    create: data,
    update: {
      kvCacheHits: data.kvCacheHits,
      kvCacheMisses: data.kvCacheMisses,
      kvCacheHitRate: data.kvCacheHitRate,
      toolCacheHits: data.toolCacheHits,
      toolCacheMisses: data.toolCacheMisses,
      toolCacheHitRate: data.toolCacheHitRate,
      tokensSaved: data.tokensSaved,
      costSavedUsd: data.costSavedUsd,
    },
  });
  return metrics;
}

export interface UpsertAIToolUsageInput {
  teamId: string;
  toolName: string;
  category: string;
  periodStart: Date;
  periodEnd: Date;
  callCount: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export async function upsertAIToolUsage(
  db: Database,
  data: UpsertAIToolUsageInput
): Promise<AIToolUsage> {
  const usage = await db.aIToolUsage.upsert({
    where: {
      teamId_toolName_periodStart: {
        teamId: data.teamId,
        toolName: data.toolName,
        periodStart: data.periodStart,
      },
    },
    create: data,
    update: {
      callCount: { increment: data.callCount },
      successCount: { increment: data.successCount },
      failureCount: { increment: data.failureCount },
      avgLatencyMs: data.avgLatencyMs,
      p95LatencyMs: data.p95LatencyMs,
    },
  });
  return usage;
}

export async function incrementAIToolUsage(
  db: Database,
  params: {
    teamId: string;
    toolName: string;
    category: string;
    periodStart: Date;
    periodEnd: Date;
    success: boolean;
    latencyMs: number;
  }
): Promise<AIToolUsage> {
  const usage = await db.aIToolUsage.upsert({
    where: {
      teamId_toolName_periodStart: {
        teamId: params.teamId,
        toolName: params.toolName,
        periodStart: params.periodStart,
      },
    },
    create: {
      teamId: params.teamId,
      toolName: params.toolName,
      category: params.category,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      callCount: 1,
      successCount: params.success ? 1 : 0,
      failureCount: params.success ? 0 : 1,
      avgLatencyMs: params.latencyMs,
      p95LatencyMs: params.latencyMs,
    },
    update: {
      callCount: { increment: 1 },
      successCount: params.success ? { increment: 1 } : undefined,
      failureCount: params.success ? undefined : { increment: 1 },
    },
  });
  return usage;
}

export async function deleteOldAIUsageLogs(
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<{ count: number }> {
  const result = await db.aIUsageLog.deleteMany({
    where: {
      teamId,
      createdAt: { lt: olderThan },
    },
  });
  return result;
}
