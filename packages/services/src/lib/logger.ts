import { createLogger } from "@openplane/observability";
import type { Logger } from "pino";

const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_CONTEXT_KEYS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "apikey",
  "accesstoken",
  "refreshtoken",
] as const;

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_CONTEXT_KEYS.some((sensitiveKey) =>
    normalized.includes(sensitiveKey)
  );
}

function redactContext(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactContext(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    redacted[key] = shouldRedactKey(key)
      ? REDACTED_VALUE
      : redactContext(nestedValue);
  }

  return redacted;
}

export const logger: Logger = createLogger({
  service: "openplane-services",
  env: process.env.NODE_ENV || "development",
  level: process.env.LOG_LEVEL || "info",
  version: process.env.APP_VERSION || "0.1.0",
});

export function createServiceLogger(context: {
  service?: string;
  teamId?: string;
  connectorId?: string;
  [key: string]: unknown;
}): Logger {
  return logger.child(redactContext(context) as Record<string, unknown>);
}

export function logWithDuration(
  level: "info" | "error" | "warn" | "debug",
  message: string,
  context: Record<string, unknown>,
  startTime: number
) {
  const duration = Date.now() - startTime;
  logger[level](
    redactContext({ ...context, duration_ms: duration }) as Record<
      string,
      unknown
    >,
    message
  );
}

export function logError(
  message: string,
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  logger.error(
    redactContext({
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    }) as Record<string, unknown>,
    message
  );
}

export default logger;
