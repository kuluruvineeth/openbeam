import { z } from "zod";

export const ResilienceErrorCodeSchema = z.enum([
  "RATE_LIMITED",
  "TIMEOUT",
  "NETWORK_ERROR",
  "PROVIDER_ERROR",
  "INVALID_REQUEST",
  "AUTHENTICATION_ERROR",
  "QUOTA_EXCEEDED",
  "MODEL_OVERLOADED",
  "CONTENT_FILTERED",
  "CONTEXT_LENGTH_EXCEEDED",
  "UNKNOWN",
]);

export type ResilienceErrorCode = z.infer<typeof ResilienceErrorCodeSchema>;

export const ClassifiedErrorSchema = z.object({
  code: ResilienceErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  retryAfterMs: z.number().int().positive().optional(),
  provider: z.string().optional(),
  originalError: z.unknown(),
});

export type ClassifiedError = z.infer<typeof ClassifiedErrorSchema>;

export const RetryConfigSchema = z.object({
  maxAttempts: z.number().int().positive(),
  baseDelayMs: z.number().int().positive(),
  maxDelayMs: z.number().int().positive(),
  backoffFactor: z.number().positive(),
  jitterFactor: z.number().min(0).max(1),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

export const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().int().positive(),
  windowMs: z.number().int().positive(),
  resetTimeoutMs: z.number().int().positive(),
  halfOpenRequests: z.number().int().positive(),
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

export const CircuitStateSchema = z.enum(["closed", "open", "half-open"]);

export type CircuitState = z.infer<typeof CircuitStateSchema>;

export const CircuitBreakerStateSchema = z.object({
  state: CircuitStateSchema,
  failures: z.number().int().nonnegative(),
  successes: z.number().int().nonnegative(),
  lastFailureAt: z.number().optional(),
  openedAt: z.number().optional(),
  nextAttemptAt: z.number().optional(),
});

export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>;

export const ResilienceProviderConfigSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  priority: z.number().int(),
});

export type ResilienceProviderConfig = z.infer<
  typeof ResilienceProviderConfigSchema
>;

export const FallbackChainConfigSchema = z.object({
  primary: ResilienceProviderConfigSchema,
  fallbacks: z.array(ResilienceProviderConfigSchema),
  failoverOnCodes: z.array(ResilienceErrorCodeSchema).optional(),
});

export type FallbackChainConfig = z.infer<typeof FallbackChainConfigSchema>;

export const ResilienceTokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  cachedTokens: z.number().int().nonnegative().optional(),
});

export type ResilienceTokenUsage = z.infer<typeof ResilienceTokenUsageSchema>;

export const CostEstimateSchema = z.object({
  inputCostUsd: z.number().nonnegative(),
  outputCostUsd: z.number().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
});

export type CostEstimate = z.infer<typeof CostEstimateSchema>;

export const UsageRecordSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  providerId: z.string(),
  modelId: z.string(),
  teamId: z.string(),
  userId: z.string().optional(),
  workflow: z.string().optional(),
  operation: z.string(),
  tokens: ResilienceTokenUsageSchema,
  cost: CostEstimateSchema,
  durationMs: z.number().nonnegative(),
  success: z.boolean(),
  errorCode: ResilienceErrorCodeSchema.optional(),
});

export type UsageRecord = z.infer<typeof UsageRecordSchema>;

export const ProviderUsageSummarySchema = z.object({
  providerId: z.string(),
  requests: z.number().int().nonnegative(),
  tokens: ResilienceTokenUsageSchema,
  costUsd: z.number().nonnegative(),
  successRate: z.number().min(0).max(1),
});

export type ProviderUsageSummary = z.infer<typeof ProviderUsageSummarySchema>;

export const ModelUsageSummarySchema = z.object({
  modelId: z.string(),
  providerId: z.string(),
  requests: z.number().int().nonnegative(),
  tokens: ResilienceTokenUsageSchema,
  costUsd: z.number().nonnegative(),
  averageDurationMs: z.number().nonnegative(),
});

export type ModelUsageSummary = z.infer<typeof ModelUsageSummarySchema>;

export const UsageSummarySchema = z.object({
  totalRequests: z.number().int().nonnegative(),
  successfulRequests: z.number().int().nonnegative(),
  failedRequests: z.number().int().nonnegative(),
  totalTokens: ResilienceTokenUsageSchema,
  totalCostUsd: z.number().nonnegative(),
  averageDurationMs: z.number().nonnegative(),
  byProvider: z.record(z.string(), ProviderUsageSummarySchema),
  byModel: z.record(z.string(), ModelUsageSummarySchema),
});

export type UsageSummary = z.infer<typeof UsageSummarySchema>;

export const ResilienceMetricsSchema = z.object({
  retryAttempts: z.number().int().nonnegative(),
  fallbackActivations: z.number().int().nonnegative(),
  circuitBreakerTrips: z.number().int().nonnegative(),
  totalLatencyMs: z.number().nonnegative(),
});

export type ResilienceMetrics = z.infer<typeof ResilienceMetricsSchema>;

export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ClassifiedErrorSchema.optional(),
  metrics: ResilienceMetricsSchema,
  usage: UsageRecordSchema.optional(),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
});

export type ExecutionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: ClassifiedError;
  metrics: ResilienceMetrics;
  usage?: UsageRecord;
  providerId?: string;
  modelId?: string;
};
