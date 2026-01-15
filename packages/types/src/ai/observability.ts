import { z } from "zod";

export const ModelPricingSchema = z.object({
  inputPer1M: z.number().nonnegative(),
  outputPer1M: z.number().nonnegative(),
  cachePer1M: z.number().nonnegative().optional(),
  reasoningPer1M: z.number().nonnegative().optional(),
});

export type ModelPricing = z.infer<typeof ModelPricingSchema>;

export const UsageEventSchema = z.object({
  traceId: z.string(),
  parentSpanId: z.string().optional(),
  teamId: z.string(),
  userId: z.string().optional(),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  reasoningTokens: z.number().int().nonnegative().optional(),
  latencyMs: z.number().nonnegative(),
  firstTokenMs: z.number().nonnegative().optional(),
  workflow: z.string().optional(),
  feature: z.string().optional(),
  operation: z.string().optional(),
  success: z.boolean().optional(),
  errorCode: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UsageEvent = z.infer<typeof UsageEventSchema>;

export const CostBreakdownSchema = z.object({
  inputCostUsd: z.number().nonnegative(),
  outputCostUsd: z.number().nonnegative(),
  cacheCostUsd: z.number().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
});

export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

export const UsageSummaryResultSchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  successfulRequests: z.number().int().nonnegative(),
  failedRequests: z.number().int().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
  costByProvider: z.record(z.string(), z.number().nonnegative()),
  costByModel: z.record(z.string(), z.number().nonnegative()),
  costByUser: z.record(z.string(), z.number().nonnegative()),
  costByWorkflow: z.record(z.string(), z.number().nonnegative()),
  avgLatencyMs: z.number().nonnegative(),
});

export type UsageSummaryResult = z.infer<typeof UsageSummaryResultSchema>;

export const CacheMetricsDataSchema = z.object({
  kvCacheHits: z.number().int().nonnegative(),
  kvCacheMisses: z.number().int().nonnegative(),
  toolCacheHits: z.number().int().nonnegative(),
  toolCacheMisses: z.number().int().nonnegative(),
  tokensSaved: z.number().int().nonnegative(),
  costSavedUsd: z.number().nonnegative(),
});

export type CacheMetricsData = z.infer<typeof CacheMetricsDataSchema>;

export const ToolUsageDataSchema = z.object({
  toolName: z.string(),
  category: z.string(),
  callCount: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
});

export type ToolUsageData = z.infer<typeof ToolUsageDataSchema>;

export const MetricsStatusSchema = z.enum(["success", "error"]);

export type MetricsStatus = z.infer<typeof MetricsStatusSchema>;

export const MetricsRecordParamsSchema = z.object({
  provider: z.string(),
  model: z.string(),
  status: MetricsStatusSchema,
  workflow: z.string().optional(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative(),
  firstTokenMs: z.number().nonnegative().optional(),
  costUsd: z.number().nonnegative(),
  teamId: z.string(),
});

export type MetricsRecordParams = z.infer<typeof MetricsRecordParamsSchema>;

export const ToolMetricsParamsSchema = z.object({
  tool: z.string(),
  category: z.string(),
  status: MetricsStatusSchema,
  latencyMs: z.number().nonnegative(),
});

export type ToolMetricsParams = z.infer<typeof ToolMetricsParamsSchema>;
