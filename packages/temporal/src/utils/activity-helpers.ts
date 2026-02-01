import {
  activityInfo,
  Context,
  heartbeat as temporalHeartbeat,
} from "@temporalio/activity";
import { ApplicationFailure, CancelledFailure } from "@temporalio/workflow";

export interface ActivityProgress {
  current: number;
  total: number;
  stage?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface HeartbeatConfig {
  intervalMs: number;
  getProgress: () => ActivityProgress;
}

export type ErrorType = "retryable" | "nonRetryable" | "cancelled";

const ERROR_CLASSIFICATIONS: Record<string, ErrorType> = {
  ValidationError: "nonRetryable",
  AuthorizationError: "nonRetryable",
  NotFoundError: "nonRetryable",
  InvalidCredentialsError: "nonRetryable",
  PermissionDeniedError: "nonRetryable",

  RateLimitError: "retryable",
  TimeoutError: "retryable",
  NetworkError: "retryable",
  ServiceUnavailableError: "retryable",
  ConnectionError: "retryable",

  CancelledError: "cancelled",
  AbortError: "cancelled",
};

export function classifyError(error: unknown): ErrorType {
  if (error instanceof CancelledFailure) {
    return "cancelled";
  }

  if (error instanceof ApplicationFailure) {
    return error.nonRetryable ? "nonRetryable" : "retryable";
  }

  if (error instanceof Error) {
    const classification = ERROR_CLASSIFICATIONS[error.name];
    if (classification) {
      return classification;
    }

    if (error.message.includes("rate limit")) {
      return "retryable";
    }
    if (error.message.includes("unauthorized")) {
      return "nonRetryable";
    }
    if (error.message.includes("not found")) {
      return "nonRetryable";
    }
  }

  return "retryable";
}

export function wrapError(
  error: unknown,
  context?: string
): ApplicationFailure {
  const errorType = classifyError(error);
  const message = error instanceof Error ? error.message : String(error);
  const fullMessage = context ? `${context}: ${message}` : message;

  switch (errorType) {
    case "nonRetryable":
      return ApplicationFailure.nonRetryable(fullMessage, "NonRetryableError", {
        originalError: error instanceof Error ? error.name : "Unknown",
        originalMessage: message,
      });

    case "cancelled":
      return ApplicationFailure.nonRetryable(fullMessage, "CancelledError", {
        originalError: error instanceof Error ? error.name : "Unknown",
      });

    default:
      return ApplicationFailure.retryable(fullMessage, "RetryableError", {
        originalError: error instanceof Error ? error.name : "Unknown",
        originalMessage: message,
      });
  }
}

export function nonRetryableError(
  message: string,
  type = "NonRetryableError",
  details?: Record<string, unknown>
): ApplicationFailure {
  return ApplicationFailure.nonRetryable(message, type, details);
}

export function retryableError(
  message: string,
  type = "RetryableError",
  details?: Record<string, unknown>
): ApplicationFailure {
  return ApplicationFailure.retryable(message, type, details);
}

export function heartbeatWithProgress(progress: ActivityProgress): void {
  temporalHeartbeat({
    progress: Math.round((progress.current / progress.total) * 100),
    current: progress.current,
    total: progress.total,
    stage: progress.stage,
    message: progress.message,
    ...progress.metadata,
  });
}

export function createAutoHeartbeat(config: HeartbeatConfig): () => void {
  const { intervalMs, getProgress } = config;

  const intervalId = setInterval(() => {
    try {
      const progress = getProgress();
      heartbeatWithProgress(progress);
      // biome-ignore lint/suspicious/noEmptyBlockStatements: heartbeat failures should be silently ignored
    } catch {}
  }, intervalMs);

  return () => {
    clearInterval(intervalId);
  };
}

export async function withHeartbeat<T>(
  fn: () => Promise<T>,
  config: HeartbeatConfig
): Promise<T> {
  const stopHeartbeat = createAutoHeartbeat(config);

  try {
    return await fn();
  } finally {
    stopHeartbeat();
  }
}

export function isCancelled(): boolean {
  try {
    return Context.current().cancellationSignal.aborted;
  } catch {
    return false;
  }
}

export function throwIfCancelled(): void {
  if (isCancelled()) {
    throw new CancelledFailure("Activity was cancelled");
  }
}

// biome-ignore lint/suspicious/useAwait: returns promise directly, caller awaits
export async function withCancellation<T>(
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  return fn(Context.current().cancellationSignal);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30_000,
    backoffMultiplier = 2,
    retryableErrors = [],
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      throwIfCancelled();
      return await fn();
    } catch (error) {
      lastError = error;

      const errorType = classifyError(error);
      if (errorType === "nonRetryable") {
        throw error;
      }
      if (errorType === "cancelled") {
        throw error;
      }

      if (
        retryableErrors.length > 0 &&
        error instanceof Error &&
        !retryableErrors.includes(error.name)
      ) {
        throw error;
      }

      if (attempt === maxAttempts) {
        break;
      }

      temporalHeartbeat({ retryAttempt: attempt, retrying: true });

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw wrapError(lastError, `Failed after ${maxAttempts} attempts`);
}

export function getActivityInfo() {
  try {
    return activityInfo();
  } catch {
    return null;
  }
}

export function checkpoint(data: Record<string, unknown>): void {
  temporalHeartbeat({
    checkpoint: true,
    ...data,
    timestamp: Date.now(),
  });
}
