import type {
  CircuitBreakerConfig,
  ModelUsageSummary,
  ProviderUsageSummary,
  ResilienceErrorCode,
  ResilienceProviderConfig,
  ResilienceTokenUsage,
  RetryConfig,
} from "@openplane/types/ai";

export type ErrorCode = ResilienceErrorCode;
export type TokenUsage = ResilienceTokenUsage;
export type ProviderConfig = ResilienceProviderConfig;

export interface UsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: ResilienceTokenUsage;
  totalCostUsd: number;
  averageDurationMs: number;
  byProvider: Map<string, ProviderUsageSummary>;
  byModel: Map<string, ModelUsageSummary>;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 30_000,
  backoffFactor: 2,
  jitterFactor: 0.2,
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  windowMs: 60_000,
  resetTimeoutMs: 300_000,
  halfOpenRequests: 1,
};

export const RETRYABLE_ERROR_CODES: Set<ErrorCode> = new Set([
  "RATE_LIMITED",
  "TIMEOUT",
  "NETWORK_ERROR",
  "PROVIDER_ERROR",
  "MODEL_OVERLOADED",
]);

export const FAILOVER_ERROR_CODES: Set<ErrorCode> = new Set([
  "RATE_LIMITED",
  "TIMEOUT",
  "PROVIDER_ERROR",
  "MODEL_OVERLOADED",
  "QUOTA_EXCEEDED",
]);
