export type ErrorCode =
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "INVALID_REQUEST"
  | "AUTHENTICATION_ERROR"
  | "QUOTA_EXCEEDED"
  | "MODEL_OVERLOADED"
  | "CONTENT_FILTERED"
  | "CONTEXT_LENGTH_EXCEEDED"
  | "UNKNOWN";

export interface ClassifiedError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  provider?: string;
  originalError: unknown;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterFactor: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  windowMs: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt?: number;
  openedAt?: number;
  nextAttemptAt?: number;
}

export interface ProviderConfig {
  providerId: string;
  modelId: string;
  priority: number;
}

export interface FallbackChainConfig {
  primary: ProviderConfig;
  fallbacks: ProviderConfig[];
  failoverOnCodes?: ErrorCode[];
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
}

export interface CostEstimate {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

export interface UsageRecord {
  id: string;
  timestamp: number;
  providerId: string;
  modelId: string;
  teamId: string;
  userId?: string;
  workflow?: string;
  operation: string;
  tokens: TokenUsage;
  cost: CostEstimate;
  durationMs: number;
  success: boolean;
  errorCode?: ErrorCode;
}

export interface UsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: TokenUsage;
  totalCostUsd: number;
  averageDurationMs: number;
  byProvider: Map<string, ProviderUsageSummary>;
  byModel: Map<string, ModelUsageSummary>;
}

export interface ProviderUsageSummary {
  providerId: string;
  requests: number;
  tokens: TokenUsage;
  costUsd: number;
  successRate: number;
}

export interface ModelUsageSummary {
  modelId: string;
  providerId: string;
  requests: number;
  tokens: TokenUsage;
  costUsd: number;
  averageDurationMs: number;
}

export interface ResilienceMetrics {
  retryAttempts: number;
  fallbackActivations: number;
  circuitBreakerTrips: number;
  totalLatencyMs: number;
}

export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: ClassifiedError;
  metrics: ResilienceMetrics;
  usage?: UsageRecord;
  providerId?: string;
  modelId?: string;
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
