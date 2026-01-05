import { DEFAULT_RETRY_CONFIG, type RetryConfig } from "./config";

const RETRYABLE_PATTERNS = [
  "timeout",
  "connection",
  "network",
  "econnreset",
  "econnrefused",
  "socket hang up",
  "temporary",
  "503",
  "500",
  "slowdown",
  "serviceunavailable",
  "internalerror",
  "requesttimeout",
];

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
  }
  return false;
}

export function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * config.backoffFactor ** attempt;
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  return Math.floor(cappedDelay + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isLastAttempt = attempt === config.maxAttempts - 1;
      if (isLastAttempt || !isRetryableError(error)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Retry failed");
}

export async function withRetryAsync<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isLastAttempt = attempt === config.maxAttempts - 1;
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Retry failed");
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  attempts: number;
  lastError?: Error;
}

export async function withRetryResult<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<RetryResult<T>> {
  let lastError: Error | undefined;
  let attempts = 0;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    attempts += 1;
    try {
      const data = await operation();
      return { success: true, data, attempts };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isLastAttempt = attempt === config.maxAttempts - 1;
      if (isLastAttempt || !isRetryableError(error)) {
        return { success: false, attempts, lastError };
      }

      const delay = calculateDelay(attempt, config);
      await sleep(delay);
    }
  }

  return { success: false, attempts, lastError };
}
