import { z } from "zod";

export const AIUsageGranularitySchema = z.enum([
  "HOUR",
  "DAY",
  "WEEK",
  "MONTH",
]);

export type AIUsageGranularity = z.infer<typeof AIUsageGranularitySchema>;

export const CreateAIUsageLogInputSchema = z.object({
  teamId: z.string(),
  userId: z.string().optional(),
  traceId: z.string(),
  parentSpanId: z.string().optional(),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cacheReadTokens: z.number().int().optional(),
  cacheWriteTokens: z.number().int().optional(),
  reasoningTokens: z.number().int().optional(),
  inputCostUsd: z.number(),
  outputCostUsd: z.number(),
  cacheCostUsd: z.number().optional(),
  totalCostUsd: z.number(),
  latencyMs: z.number().int(),
  firstTokenMs: z.number().int().optional(),
  workflow: z.string().optional(),
  feature: z.string().optional(),
  operation: z.string().optional(),
  success: z.boolean().optional(),
  errorCode: z.string().optional(),
  metadata: z.unknown().optional(),
});

export type CreateAIUsageLogInput = z.infer<typeof CreateAIUsageLogInputSchema>;

export const UpsertAIUsageSummaryInputSchema = z.object({
  teamId: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  granularity: AIUsageGranularitySchema,
  totalRequests: z.number().int(),
  successfulRequests: z.number().int(),
  failedRequests: z.number().int(),
  totalInputTokens: z.bigint(),
  totalOutputTokens: z.bigint(),
  totalCacheTokens: z.bigint(),
  totalCostUsd: z.number(),
  costByProvider: z.record(z.string(), z.number()),
  costByModel: z.record(z.string(), z.number()),
  costByWorkflow: z.record(z.string(), z.number()),
  costByUser: z.record(z.string(), z.number()),
  avgLatencyMs: z.number(),
  p50LatencyMs: z.number(),
  p95LatencyMs: z.number(),
  p99LatencyMs: z.number(),
});

export type UpsertAIUsageSummaryInput = z.infer<
  typeof UpsertAIUsageSummaryInputSchema
>;

export const UpsertAICacheMetricsInputSchema = z.object({
  teamId: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  kvCacheHits: z.number().int(),
  kvCacheMisses: z.number().int(),
  kvCacheHitRate: z.number(),
  toolCacheHits: z.number().int(),
  toolCacheMisses: z.number().int(),
  toolCacheHitRate: z.number(),
  tokensSaved: z.bigint(),
  costSavedUsd: z.number(),
});

export type UpsertAICacheMetricsInput = z.infer<
  typeof UpsertAICacheMetricsInputSchema
>;

export const UpsertAIToolUsageInputSchema = z.object({
  teamId: z.string(),
  toolName: z.string(),
  category: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  callCount: z.number().int(),
  successCount: z.number().int(),
  failureCount: z.number().int(),
  avgLatencyMs: z.number(),
  p95LatencyMs: z.number(),
});

export type UpsertAIToolUsageInput = z.infer<
  typeof UpsertAIToolUsageInputSchema
>;

export const BillingUsageSummarySchema = z.object({
  periodStart: z.date(),
  periodEnd: z.date(),
  totalRequests: z.number().int(),
  totalInputTokens: z.bigint(),
  totalOutputTokens: z.bigint(),
  totalCacheTokens: z.bigint(),
  totalCostUsd: z.number(),
  costByProvider: z.record(z.string(), z.number()),
  costByModel: z.record(z.string(), z.number()),
});

export type BillingUsageSummary = z.infer<typeof BillingUsageSummarySchema>;

export const TopCostDriversOptionsSchema = z.object({
  teamId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  limit: z.number().int().positive().optional(),
});

export type TopCostDriversOptions = z.infer<typeof TopCostDriversOptionsSchema>;

export const AIUsageLogForExportSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string().nullable(),
  traceId: z.string(),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cacheReadTokens: z.number().int(),
  cacheWriteTokens: z.number().int(),
  reasoningTokens: z.number().int(),
  inputCostUsd: z.number(),
  outputCostUsd: z.number(),
  cacheCostUsd: z.number(),
  totalCostUsd: z.number(),
  latencyMs: z.number().int(),
  firstTokenMs: z.number().int().nullable(),
  workflow: z.string().nullable(),
  feature: z.string().nullable(),
  operation: z.string().nullable(),
  success: z.boolean(),
  errorCode: z.string().nullable(),
  createdAt: z.date(),
});

export type AIUsageLogForExport = z.infer<typeof AIUsageLogForExportSchema>;
