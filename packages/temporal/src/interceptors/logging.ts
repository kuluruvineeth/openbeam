import { activityInfo } from "@temporalio/activity";
import type {
  ActivityExecuteInput,
  ActivityInboundCallsInterceptor,
  Next,
} from "@temporalio/worker";

export interface LoggingConfig {
  level?: "debug" | "info" | "warn" | "error";
  format?: "json" | "text";
  includePayloads?: boolean;
  maxPayloadSize?: number;
}

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(configLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[configLevel];
}

function formatLog(
  format: "json" | "text",
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): string {
  if (format === "json") {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data,
    });
  }

  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

function truncatePayload(payload: unknown, maxSize: number): unknown {
  const str = JSON.stringify(payload);
  if (str.length <= maxSize) {
    return payload;
  }

  return {
    _truncated: true,
    _originalSize: str.length,
    _preview: str.slice(0, maxSize),
  };
}

export function createLoggingInterceptors(config: LoggingConfig = {}): {
  activityInbound: ActivityInboundCallsInterceptor;
} {
  const {
    level = "info",
    format = "json",
    includePayloads = false,
    maxPayloadSize = 1000,
  } = config;

  const activityInbound: ActivityInboundCallsInterceptor = {
    async execute(
      input: ActivityExecuteInput,
      next: Next<ActivityInboundCallsInterceptor, "execute">
    ): Promise<unknown> {
      const info = activityInfo();
      const activityType = info.activityType;
      const startTime = performance.now();

      const baseData: Record<string, unknown> = {
        activityType,
        component: "temporal-activity",
      };

      if (includePayloads && input.args.length > 0) {
        baseData.input = truncatePayload(input.args, maxPayloadSize);
      }

      if (shouldLog(level, "info")) {
        console.log(
          formatLog(
            format,
            "info",
            `Activity started: ${activityType}`,
            baseData
          )
        );
      }

      try {
        const result = await next(input);
        const duration = performance.now() - startTime;

        if (shouldLog(level, "info")) {
          const successData: Record<string, unknown> = {
            ...baseData,
            durationMs: Math.round(duration),
            status: "success",
          };

          if (includePayloads && result !== undefined) {
            successData.output = truncatePayload(result, maxPayloadSize);
          }

          console.log(
            formatLog(
              format,
              "info",
              `Activity completed: ${activityType}`,
              successData
            )
          );
        }

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        if (shouldLog(level, "error")) {
          console.error(
            formatLog(format, "error", `Activity failed: ${activityType}`, {
              ...baseData,
              durationMs: Math.round(duration),
              status: "error",
              error: error instanceof Error ? error.message : String(error),
              errorType: error instanceof Error ? error.name : "Unknown",
            })
          );
        }

        throw error;
      }
    },
  };

  return {
    activityInbound,
  };
}
