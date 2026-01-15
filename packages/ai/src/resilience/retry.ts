import type { ClassifiedError, RetryConfig } from "@openplane/types/ai";
import { classifyError } from "./errors";
import { DEFAULT_RETRY_CONFIG } from "./types";

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: ClassifiedError;
  attempts: number;
  totalDelayMs: number;
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError?: ClassifiedError;
  totalDelayMs: number;
}

export type RetryPredicate = (
  error: ClassifiedError,
  ctx: RetryContext
) => boolean;

export interface RetryOptions extends Partial<RetryConfig> {
  shouldRetry?: RetryPredicate;
  onRetry?: (error: ClassifiedError, ctx: RetryContext) => void;
  signal?: AbortSignal;
}

const defaultShouldRetry: RetryPredicate = (error) => error.retryable;

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const config: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...options,
  };

  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let totalDelayMs = 0;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    if (options.signal?.aborted) {
      return {
        success: false,
        error: {
          code: "UNKNOWN",
          message: "Operation aborted",
          retryable: false,
          originalError: new Error("Operation aborted"),
        },
        attempts: attempt,
        totalDelayMs,
      };
    }

    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalDelayMs,
      };
    } catch (err) {
      const classified = classifyError(err);
      const ctx: RetryContext = {
        attempt,
        maxAttempts: config.maxAttempts,
        lastError: classified,
        totalDelayMs,
      };

      const isLastAttempt = attempt === config.maxAttempts;
      const canRetry = !isLastAttempt && shouldRetry(classified, ctx);

      if (!canRetry) {
        return {
          success: false,
          error: classified,
          attempts: attempt,
          totalDelayMs,
        };
      }

      const delay = calculateDelay(classified, attempt, config);
      totalDelayMs += delay;

      options.onRetry?.(classified, ctx);

      await sleep(delay, options.signal);
    }
  }

  return {
    success: false,
    error: {
      code: "UNKNOWN",
      message: "Max retry attempts exceeded",
      retryable: false,
      originalError: new Error("Max retry attempts exceeded"),
    },
    attempts: config.maxAttempts,
    totalDelayMs,
  };
}

function calculateDelay(
  error: ClassifiedError,
  attempt: number,
  config: RetryConfig
): number {
  if (error.retryAfterMs) {
    return Math.min(error.retryAfterMs, config.maxDelayMs);
  }

  const exponentialDelay =
    config.baseDelayMs * config.backoffFactor ** (attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = cappedDelay * config.jitterFactor * Math.random();

  return Math.floor(cappedDelay + jitter);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Operation aborted"));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new Error("Operation aborted"));
      },
      { once: true }
    );
  });
}

export function createRetryableOperation<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  options: RetryOptions = {}
): (...args: Args) => Promise<RetryResult<T>> {
  return (...args: Args) => withRetry(() => fn(...args), options);
}

export class RetryPolicy {
  private readonly config: RetryConfig;
  private readonly shouldRetry: RetryPredicate;

  constructor(options: RetryOptions = {}) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...options,
    };
    this.shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  }

  execute<T>(
    operation: () => Promise<T>,
    options?: Pick<RetryOptions, "onRetry" | "signal">
  ): Promise<RetryResult<T>> {
    return withRetry(operation, {
      ...this.config,
      shouldRetry: this.shouldRetry,
      ...options,
    });
  }

  wrap<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T>
  ): (...args: Args) => Promise<RetryResult<T>> {
    return createRetryableOperation(fn, {
      ...this.config,
      shouldRetry: this.shouldRetry,
    });
  }
}

export const defaultRetryPolicy = new RetryPolicy();

export const aggressiveRetryPolicy = new RetryPolicy({
  maxAttempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 60_000,
  backoffFactor: 2.5,
});

export const conservativeRetryPolicy = new RetryPolicy({
  maxAttempts: 2,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  backoffFactor: 2,
});
