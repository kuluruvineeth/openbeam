import type {
  CircuitBreakerConfig,
  RetryConfig,
  ToolExecutionResult,
} from "@openbeam/types/ai";
import {
  CircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RETRY_CONFIG,
  withRetry,
} from "../resilience";
import type { ErrorCode, ToolContext } from "./types";

export interface ToolResilienceConfig {
  retry?: Partial<RetryConfig> | false;
  circuitBreaker?: Partial<CircuitBreakerConfig> | false;
}

export interface ToolExecutionStats {
  retryAttempts: number;
  circuitBreakerTrips: number;
  totalLatencyMs: number;
}

const toolCircuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(
  toolName: string,
  config: CircuitBreakerConfig
): CircuitBreaker {
  let cb = toolCircuitBreakers.get(toolName);
  if (!cb) {
    cb = new CircuitBreaker(toolName, config);
    toolCircuitBreakers.set(toolName, cb);
  }
  return cb;
}

export function clearCircuitBreaker(toolName: string): void {
  toolCircuitBreakers.delete(toolName);
}

export function clearAllCircuitBreakers(): void {
  toolCircuitBreakers.clear();
}

export function getCircuitBreakerState(
  toolName: string
): "closed" | "open" | "half-open" | undefined {
  return toolCircuitBreakers.get(toolName)?.getState().state;
}

function isRetryableResult<T>(result: ToolExecutionResult<T>): boolean {
  return !result.success && (result.error?.retryable ?? false);
}

function mapErrorCodeToRetryable(code: ErrorCode): boolean {
  switch (code) {
    case "RATE_LIMITED":
    case "TIMEOUT":
    case "PROVIDER_ERROR":
    case "NETWORK_ERROR":
      return true;
    case "UNAUTHORIZED":
    case "NOT_FOUND":
    case "INVALID_INPUT":
    case "QUOTA_EXCEEDED":
    case "INTERNAL_ERROR":
      return false;
    default:
      return false;
  }
}

function mapResilienceErrorCode(code: string | undefined): ErrorCode {
  switch (code) {
    case "RATE_LIMITED":
      return "RATE_LIMITED";
    case "TIMEOUT":
      return "TIMEOUT";
    case "NETWORK_ERROR":
      return "NETWORK_ERROR";
    case "PROVIDER_ERROR":
    case "MODEL_OVERLOADED":
    case "CONTENT_FILTERED":
    case "CONTEXT_LENGTH_EXCEEDED":
      return "PROVIDER_ERROR";
    case "AUTHENTICATION_ERROR":
      return "UNAUTHORIZED";
    case "INVALID_REQUEST":
      return "INVALID_INPUT";
    case "QUOTA_EXCEEDED":
      return "QUOTA_EXCEEDED";
    default:
      return "INTERNAL_ERROR";
  }
}

export async function executeWithToolResilience<T>(
  toolName: string,
  execute: () => Promise<ToolExecutionResult<T>>,
  context: ToolContext,
  config: ToolResilienceConfig = {}
): Promise<{ result: ToolExecutionResult<T>; stats: ToolExecutionStats }> {
  const startTime = performance.now();
  const stats: ToolExecutionStats = {
    retryAttempts: 0,
    circuitBreakerTrips: 0,
    totalLatencyMs: 0,
  };

  const retryConfig: RetryConfig | false =
    config.retry === false
      ? false
      : { ...DEFAULT_RETRY_CONFIG, ...config.retry };

  const cbConfig: CircuitBreakerConfig | false =
    config.circuitBreaker === false
      ? false
      : { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config.circuitBreaker };

  let wrappedExecute = execute;

  if (cbConfig) {
    const cb = getCircuitBreaker(toolName, cbConfig);
    const originalExecute = wrappedExecute;

    wrappedExecute = async () => {
      const cbResult = await cb.execute(async () => {
        const result = await originalExecute();

        if (!result.success && result.error?.retryable) {
          throw new Error(result.error.message);
        }

        return result;
      });

      if (cbResult.circuitState === "open") {
        stats.circuitBreakerTrips += 1;
      }

      if (!cbResult.success) {
        const errorCode: ErrorCode = "PROVIDER_ERROR";
        return {
          success: false,
          error: {
            code: errorCode,
            message: cbResult.error?.message ?? "Circuit breaker tripped",
            retryable: false,
          },
        } as ToolExecutionResult<T>;
      }

      return cbResult.data as ToolExecutionResult<T>;
    };
  }

  let result: ToolExecutionResult<T>;

  if (retryConfig) {
    const retryResult = await withRetry(
      async () => {
        const res = await wrappedExecute();

        if (isRetryableResult(res)) {
          const err = new Error(res.error?.message ?? "Tool execution failed");
          (err as Error & { retryable: boolean }).retryable = true;
          throw err;
        }

        return res;
      },
      {
        ...retryConfig,
        signal: context.abortSignal,
        onRetry: () => {
          stats.retryAttempts += 1;
        },
        shouldRetry: (error) => {
          if (error && typeof error === "object" && "retryable" in error) {
            return (error as { retryable: boolean }).retryable;
          }
          return false;
        },
      }
    );

    if (retryResult.success) {
      result = retryResult.data as ToolExecutionResult<T>;
    } else {
      const resilienceCode = retryResult.error?.code;
      const errorCode: ErrorCode = mapResilienceErrorCode(resilienceCode);
      result = {
        success: false,
        error: {
          code: errorCode,
          message: retryResult.error?.message ?? "Tool execution failed",
          retryable: mapErrorCodeToRetryable(errorCode),
        },
      };
    }
  } else {
    try {
      result = await wrappedExecute();
    } catch (err) {
      result = {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
          retryable: false,
        },
      };
    }
  }

  stats.totalLatencyMs = performance.now() - startTime;

  if (result.metadata) {
    result.metadata.latencyMs = stats.totalLatencyMs;
  } else {
    result.metadata = { latencyMs: stats.totalLatencyMs };
  }

  return { result, stats };
}

export const defaultToolResilienceConfig: ToolResilienceConfig = {
  retry: {
    maxAttempts: 2,
    baseDelayMs: 100,
    maxDelayMs: 5000,
    backoffFactor: 2,
  },
  circuitBreaker: {
    failureThreshold: 5,
    windowMs: 60_000,
    resetTimeoutMs: 30_000,
  },
};

export const aggressiveToolResilienceConfig: ToolResilienceConfig = {
  retry: {
    maxAttempts: 4,
    baseDelayMs: 50,
    maxDelayMs: 10_000,
    backoffFactor: 2.5,
  },
  circuitBreaker: {
    failureThreshold: 10,
    windowMs: 120_000,
    resetTimeoutMs: 60_000,
  },
};

export const noRetryConfig: ToolResilienceConfig = {
  retry: false,
  circuitBreaker: {
    failureThreshold: 3,
    windowMs: 30_000,
    resetTimeoutMs: 15_000,
  },
};
