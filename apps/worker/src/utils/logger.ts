import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  // Base context for all logs
  base: {
    service: "openplane-worker",
    env: process.env.NODE_ENV || "development",
  },
});

/**
 * Create a child logger with job context
 */
export function createJobLogger(context: {
  jobId?: string;
  connectorId?: string;
  teamId?: string;
  syncType?: string;
}) {
  return logger.child(context);
}

/**
 * Log with duration tracking
 */
export function logWithDuration(
  level: "info" | "error" | "warn" | "debug",
  message: string,
  context: Record<string, unknown>,
  startTime: number
) {
  const duration = Date.now() - startTime;
  logger[level]({ ...context, duration }, message);
}

/**
 * Log error with full stack trace
 */
export function logError(
  message: string,
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  logger.error(
    {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    },
    message
  );
}

export default logger;
