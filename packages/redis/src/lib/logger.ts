import { createLogger } from "@openplane/observability";
import { SpanStatusCode, trace } from "@opentelemetry/api";

const logger = createLogger({
  service: "openplane-redis",
  env: process.env.NODE_ENV || "development",
  level: process.env.LOG_LEVEL || "info",
  version: process.env.APP_VERSION || "0.1.0",
});

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeAttributeValue(value: unknown): string | number | boolean {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value == null) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function addTraceEvent(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {}
): void {
  const span = trace.getActiveSpan();
  if (!span) {
    return;
  }

  const attributes: Record<string, string | number | boolean> = {
    message,
    level,
  };

  for (const [key, value] of Object.entries(context)) {
    attributes[key] = normalizeAttributeValue(value);
  }

  span.addEvent("redis.log", attributes);
  span.setStatus({
    code:
      level === "warn" || level === "error"
        ? SpanStatusCode.ERROR
        : SpanStatusCode.OK,
    message,
  });
}

export const redisLogger = {
  debug(message: string, context?: Record<string, unknown>): void {
    logger.debug(context ?? {}, message);
    addTraceEvent("debug", message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    logger.info(context ?? {}, message);
    addTraceEvent("info", message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    logger.warn(context ?? {}, message);
    addTraceEvent("warn", message, context);
  },

  error(message: string, context?: Record<string, unknown>): void {
    logger.error(context ?? {}, message);
    addTraceEvent("error", message, context);
  },

  formatError,
};
