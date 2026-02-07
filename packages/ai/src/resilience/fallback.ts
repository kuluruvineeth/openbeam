import type { ClassifiedError, FallbackChainConfig } from "@openplane/types/ai";
import { classifyError } from "./errors";
import type { ProviderConfig } from "./types";
import { FAILOVER_ERROR_CODES } from "./types";

export interface FallbackResult<T> {
  success: boolean;
  data?: T;
  error?: ClassifiedError;
  providerId: string;
  modelId: string;
  attemptedProviders: string[];
  fallbacksUsed: number;
}

export interface ProviderOperation<T> {
  execute: (provider: ProviderConfig) => Promise<T>;
}

export type FallbackPredicate = (error: ClassifiedError) => boolean;

export interface FallbackOptions {
  shouldFailover?: FallbackPredicate;
  onFallback?: (
    error: ClassifiedError,
    from: ProviderConfig,
    to: ProviderConfig
  ) => void;
  signal?: AbortSignal;
}

const defaultShouldFailover: FallbackPredicate = (error) =>
  FAILOVER_ERROR_CODES.has(error.code);

export async function withFallback<T>(
  config: FallbackChainConfig,
  operation: ProviderOperation<T>,
  options: FallbackOptions = {}
): Promise<FallbackResult<T>> {
  const shouldFailover = options.shouldFailover ?? defaultShouldFailover;
  const attemptedProviders: string[] = [];

  const providers = [config.primary, ...config.fallbacks].sort(
    (a, b) => a.priority - b.priority
  );

  let lastError: ClassifiedError | undefined;
  let fallbacksUsed = 0;

  for (const [i, provider] of providers.entries()) {
    attemptedProviders.push(provider.providerId);

    if (options.signal?.aborted) {
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: "Operation aborted",
          retryable: false,
          originalError: new Error("Operation aborted"),
        },
        providerId: provider.providerId,
        modelId: provider.modelId,
        attemptedProviders,
        fallbacksUsed,
      };
    }

    try {
      const data = await operation.execute(provider);
      return {
        success: true,
        data,
        providerId: provider.providerId,
        modelId: provider.modelId,
        attemptedProviders,
        fallbacksUsed,
      };
    } catch (err) {
      const classified = classifyError(err, provider.providerId);
      lastError = classified;

      const isLastProvider = i === providers.length - 1;
      if (isLastProvider) {
        break;
      }

      const canFailover = shouldFailover(classified);
      if (!canFailover) {
        break;
      }

      const nextProvider = providers[i + 1];
      if (nextProvider) {
        options.onFallback?.(classified, provider, nextProvider);
      }
      fallbacksUsed += 1;
    }
  }

  const lastProvider = providers.at(-1) ?? config.primary;
  return {
    success: false,
    error: lastError ?? {
      code: "UNKNOWN",
      message: "All providers failed",
      retryable: false,
      originalError: new Error("All providers failed"),
    },
    providerId: lastProvider.providerId,
    modelId: lastProvider.modelId,
    attemptedProviders,
    fallbacksUsed,
  };
}

export class FallbackChain<T> {
  private readonly config: FallbackChainConfig;
  private readonly shouldFailover: FallbackPredicate;
  private readonly providerHealth = new Map<string, ProviderHealth>();

  constructor(
    config: FallbackChainConfig,
    options: { shouldFailover?: FallbackPredicate } = {}
  ) {
    this.config = config;
    this.shouldFailover = options.shouldFailover ?? defaultShouldFailover;

    for (const provider of [config.primary, ...config.fallbacks]) {
      this.providerHealth.set(provider.providerId, {
        healthy: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
      });
    }
  }

  async execute(
    operation: ProviderOperation<T>,
    options?: FallbackOptions
  ): Promise<FallbackResult<T>> {
    const healthyProviders = this.getHealthyProviders();

    if (healthyProviders.length === 0) {
      this.resetAllProviders();
      return withFallback(this.config, operation, {
        ...options,
        shouldFailover: this.shouldFailover,
        onFallback: (error, from, to) => {
          this.recordFailure(from.providerId);
          options?.onFallback?.(error, from, to);
        },
      });
    }

    const primary = healthyProviders[0];
    if (!primary) {
      return withFallback(this.config, operation, {
        ...options,
        shouldFailover: this.shouldFailover,
        onFallback: (error, from, to) => {
          this.recordFailure(from.providerId);
          options?.onFallback?.(error, from, to);
        },
      });
    }

    const adaptedConfig: FallbackChainConfig = {
      primary,
      fallbacks: healthyProviders.slice(1),
    };

    const result = await withFallback(adaptedConfig, operation, {
      ...options,
      shouldFailover: this.shouldFailover,
      onFallback: (error, from, to) => {
        this.recordFailure(from.providerId);
        options?.onFallback?.(error, from, to);
      },
    });

    if (result.success) {
      this.recordSuccess(result.providerId);
    } else {
      this.recordFailure(result.providerId);
    }

    return result;
  }

  private getHealthyProviders(): ProviderConfig[] {
    const allProviders = [this.config.primary, ...this.config.fallbacks];
    return allProviders
      .filter((p) => {
        const health = this.providerHealth.get(p.providerId);
        return health?.healthy ?? true;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  private recordSuccess(providerId: string): void {
    const health = this.providerHealth.get(providerId);
    if (health) {
      health.healthy = true;
      health.lastCheck = Date.now();
      health.consecutiveFailures = 0;
    }
  }

  private recordFailure(providerId: string): void {
    const health = this.providerHealth.get(providerId);
    if (health) {
      health.consecutiveFailures += 1;
      health.lastCheck = Date.now();
      if (health.consecutiveFailures >= 3) {
        health.healthy = false;
      }
    }
  }

  private resetAllProviders(): void {
    for (const health of this.providerHealth.values()) {
      health.healthy = true;
      health.consecutiveFailures = 0;
    }
  }

  getProviderHealth(): Map<string, ProviderHealth> {
    return new Map(this.providerHealth);
  }

  markProviderUnhealthy(providerId: string): void {
    const health = this.providerHealth.get(providerId);
    if (health) {
      health.healthy = false;
    }
  }

  markProviderHealthy(providerId: string): void {
    const health = this.providerHealth.get(providerId);
    if (health) {
      health.healthy = true;
      health.consecutiveFailures = 0;
    }
  }
}

interface ProviderHealth {
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

export const DEFAULT_CHAT_FALLBACK_CHAIN: FallbackChainConfig = {
  primary: {
    providerId: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    priority: 1,
  },
  fallbacks: [
    { providerId: "openai", modelId: "gpt-4o", priority: 2 },
    { providerId: "google", modelId: "gemini-2.0-flash", priority: 3 },
  ],
};

export const DEFAULT_EMBEDDING_FALLBACK_CHAIN: FallbackChainConfig = {
  primary: {
    providerId: "openai",
    modelId: "text-embedding-3-large",
    priority: 1,
  },
  fallbacks: [
    { providerId: "google", modelId: "text-embedding-004", priority: 2 },
  ],
};

export function createFallbackChain<T>(
  config: FallbackChainConfig,
  options?: { shouldFailover?: FallbackPredicate }
): FallbackChain<T> {
  return new FallbackChain<T>(config, options);
}
