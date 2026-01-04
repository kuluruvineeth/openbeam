import { circuitBreakerRegistry } from "./circuit-breaker";
import { classifyError } from "./errors";
import { type FallbackOptions, withFallback } from "./fallback";
import { type RetryOptions, withRetry } from "./retry";
import { globalUsageTracker, type UsageTracker } from "./tracking";
import type {
  CircuitBreakerConfig,
  ExecutionResult,
  FallbackChainConfig,
  ProviderConfig,
  ResilienceMetrics,
  RetryConfig,
  TokenUsage,
} from "./types";
import { DEFAULT_CIRCUIT_BREAKER_CONFIG, DEFAULT_RETRY_CONFIG } from "./types";

export interface ResilientExecutorConfig {
  retry?: Partial<RetryConfig> | false;
  circuitBreaker?: Partial<CircuitBreakerConfig> | false;
  fallback?: FallbackChainConfig | false;
  tracking?: UsageTracker | false;
}

export interface ExecutorContext {
  teamId: string;
  userId?: string;
  workflow?: string;
  operation: string;
  signal?: AbortSignal;
}

export interface ProviderOperation<T> {
  execute: (provider: ProviderConfig) => Promise<T>;
  extractUsage?: (result: T) => TokenUsage | undefined;
}

export class ResilientExecutor {
  private readonly retryConfig: RetryConfig | false;
  private readonly circuitBreakerConfig: CircuitBreakerConfig | false;
  private readonly fallbackConfig: FallbackChainConfig | false;
  private readonly tracker: UsageTracker | false;

  constructor(config: ResilientExecutorConfig = {}) {
    this.retryConfig =
      config.retry === false
        ? false
        : { ...DEFAULT_RETRY_CONFIG, ...config.retry };

    this.circuitBreakerConfig =
      config.circuitBreaker === false
        ? false
        : { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config.circuitBreaker };

    this.fallbackConfig = config.fallback ?? false;

    this.tracker =
      config.tracking === false
        ? false
        : (config.tracking ?? globalUsageTracker);
  }

  async execute<T>(
    operation: ProviderOperation<T>,
    ctx: ExecutorContext,
    provider?: ProviderConfig
  ): Promise<ExecutionResult<T>> {
    const startTime = performance.now();
    const metrics: ResilienceMetrics = {
      retryAttempts: 0,
      fallbackActivations: 0,
      circuitBreakerTrips: 0,
      totalLatencyMs: 0,
    };

    let result: ExecutionResult<T>;

    if (this.fallbackConfig && !provider) {
      result = await this.executeWithFallback(operation, ctx, metrics);
    } else {
      const targetProvider = provider ?? {
        providerId: "default",
        modelId: "default",
        priority: 1,
      };
      result = await this.executeSingleProvider(
        operation,
        ctx,
        targetProvider,
        metrics
      );
    }

    metrics.totalLatencyMs = performance.now() - startTime;
    result.metrics = metrics;

    if (this.tracker && result.usage) {
      this.tracker.record({
        providerId: result.providerId ?? "unknown",
        modelId: result.modelId ?? "unknown",
        teamId: ctx.teamId,
        userId: ctx.userId,
        workflow: ctx.workflow,
        operation: ctx.operation,
        tokens: result.usage.tokens,
        durationMs: metrics.totalLatencyMs,
        success: result.success,
        errorCode: result.error?.code,
      });
    }

    return result;
  }

  private async executeWithFallback<T>(
    operation: ProviderOperation<T>,
    ctx: ExecutorContext,
    metrics: ResilienceMetrics
  ): Promise<ExecutionResult<T>> {
    const fallbackConfig = this.fallbackConfig as FallbackChainConfig;

    const wrappedOperation = {
      execute: async (provider: ProviderConfig): Promise<T> => {
        const singleResult = await this.executeSingleProvider(
          operation,
          ctx,
          provider,
          metrics
        );

        if (!singleResult.success) {
          throw (
            singleResult.error?.originalError ??
            new Error(singleResult.error?.message)
          );
        }

        return singleResult.data as T;
      },
    };

    const fallbackOptions: FallbackOptions = {
      signal: ctx.signal,
      onFallback: () => {
        metrics.fallbackActivations += 1;
      },
    };

    const fallbackResult = await withFallback(
      fallbackConfig,
      wrappedOperation,
      fallbackOptions
    );

    if (fallbackResult.success) {
      return {
        success: true,
        data: fallbackResult.data,
        metrics,
        providerId: fallbackResult.providerId,
        modelId: fallbackResult.modelId,
      };
    }

    return {
      success: false,
      error: fallbackResult.error,
      metrics,
      providerId: fallbackResult.providerId,
      modelId: fallbackResult.modelId,
    };
  }

  private async executeSingleProvider<T>(
    operation: ProviderOperation<T>,
    ctx: ExecutorContext,
    provider: ProviderConfig,
    metrics: ResilienceMetrics
  ): Promise<ExecutionResult<T>> {
    const executeCore = async (): Promise<T> => operation.execute(provider);

    let wrappedExecution = executeCore;

    if (this.circuitBreakerConfig) {
      const circuitBreaker = circuitBreakerRegistry.get(
        `${provider.providerId}:${provider.modelId}`,
        this.circuitBreakerConfig
      );

      wrappedExecution = async () => {
        const cbResult = await circuitBreaker.execute(executeCore);

        if (cbResult.circuitState === "open") {
          metrics.circuitBreakerTrips += 1;
        }

        if (!cbResult.success) {
          throw (
            cbResult.error?.originalError ?? new Error(cbResult.error?.message)
          );
        }

        return cbResult.data as T;
      };
    }

    if (this.retryConfig) {
      const retryOptions: RetryOptions = {
        ...this.retryConfig,
        signal: ctx.signal,
        onRetry: () => {
          metrics.retryAttempts += 1;
        },
      };

      const retryResult = await withRetry(wrappedExecution, retryOptions);

      if (retryResult.success) {
        const usage = operation.extractUsage?.(retryResult.data as T);
        return {
          success: true,
          data: retryResult.data,
          metrics,
          providerId: provider.providerId,
          modelId: provider.modelId,
          usage: usage
            ? {
                id: "",
                timestamp: Date.now(),
                providerId: provider.providerId,
                modelId: provider.modelId,
                teamId: ctx.teamId,
                operation: ctx.operation,
                tokens: usage,
                cost: { inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0 },
                durationMs: 0,
                success: true,
              }
            : undefined,
        };
      }

      return {
        success: false,
        error: retryResult.error,
        metrics,
        providerId: provider.providerId,
        modelId: provider.modelId,
      };
    }

    try {
      const data = await wrappedExecution();
      const usage = operation.extractUsage?.(data);

      return {
        success: true,
        data,
        metrics,
        providerId: provider.providerId,
        modelId: provider.modelId,
        usage: usage
          ? {
              id: "",
              timestamp: Date.now(),
              providerId: provider.providerId,
              modelId: provider.modelId,
              teamId: ctx.teamId,
              operation: ctx.operation,
              tokens: usage,
              cost: { inputCostUsd: 0, outputCostUsd: 0, totalCostUsd: 0 },
              durationMs: 0,
              success: true,
            }
          : undefined,
      };
    } catch (err) {
      return {
        success: false,
        error: classifyError(err, provider.providerId),
        metrics,
        providerId: provider.providerId,
        modelId: provider.modelId,
      };
    }
  }
}

export function createResilientExecutor(
  config?: ResilientExecutorConfig
): ResilientExecutor {
  return new ResilientExecutor(config);
}

export const defaultExecutor = new ResilientExecutor();

export const productionExecutor = new ResilientExecutor({
  retry: {
    maxAttempts: 3,
    baseDelayMs: 200,
    maxDelayMs: 30_000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    windowMs: 60_000,
    resetTimeoutMs: 300_000,
  },
});

export const aggressiveExecutor = new ResilientExecutor({
  retry: {
    maxAttempts: 5,
    baseDelayMs: 100,
    maxDelayMs: 60_000,
    backoffFactor: 2.5,
  },
  circuitBreaker: {
    failureThreshold: 10,
    windowMs: 120_000,
    resetTimeoutMs: 180_000,
  },
});

export function executeWithResilience<T>(
  operation: ProviderOperation<T>,
  ctx: ExecutorContext,
  provider?: ProviderConfig
): Promise<ExecutionResult<T>> {
  return defaultExecutor.execute(operation, ctx, provider);
}
