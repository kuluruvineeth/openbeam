import { trace } from "@opentelemetry/api";
import pino, {
  type DestinationStream,
  type Logger,
  type LoggerOptions,
} from "pino";
import { loadObservabilityConfig } from "./config";
import {
  getRequestContext,
  type RequestContext,
  runWithRequestContext,
} from "./context";
import { PINO_REDACT_PATHS } from "./redaction";

function resolvePrettyTransport(): LoggerOptions["transport"] {
  try {
    const resolved = require.resolve("pino-pretty");
    return {
      target: resolved,
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };
  } catch {
    return;
  }
}

export interface CreateLoggerOptions {
  service: string;
  env?: string;
  level?: string;
  version?: string;
  pretty?: boolean;
  destination?: DestinationStream;
}

function getActiveTraceFields(): {
  trace_id?: string;
  span_id?: string;
} {
  const spanContext = trace.getActiveSpan()?.spanContext();

  if (!spanContext) {
    return {};
  }

  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  };
}

export function createLogger(options: CreateLoggerOptions): Logger {
  const config = loadObservabilityConfig();
  const isDevelopment = (options.env ?? config.nodeEnv) !== "production";
  const shouldUsePretty =
    options.pretty ?? (isDevelopment && options.destination === undefined);
  const pinoConfig: LoggerOptions = {
    level: options.level ?? config.logLevel,
    base: {
      service: options.service,
      env: options.env ?? config.nodeEnv,
      version: options.version ?? config.appVersion,
    },
    redact: {
      paths: [...PINO_REDACT_PATHS],
      censor: "[REDACTED]",
    },
    mixin() {
      const requestContext = getRequestContext();
      const traceFields = getActiveTraceFields();

      return {
        request_id: requestContext?.requestId,
        method: requestContext?.method,
        path: requestContext?.path,
        route: requestContext?.route,
        team_id: requestContext?.teamId,
        user_id: requestContext?.userId,
        ...traceFields,
      };
    },
    transport: shouldUsePretty ? resolvePrettyTransport() : undefined,
  };

  if (options.destination) {
    return pino(pinoConfig, options.destination);
  }

  return pino(pinoConfig);
}

let cachedLogger: Logger | null = null;

export function getLogger(options?: CreateLoggerOptions): Logger {
  if (options) {
    cachedLogger = createLogger(options);
    return cachedLogger;
  }

  if (cachedLogger) {
    return cachedLogger;
  }

  const config = loadObservabilityConfig();
  cachedLogger = createLogger({
    service: process.env.OBS_SERVICE_NAME ?? "openbeam",
    env: config.nodeEnv,
    level: config.logLevel,
    version: config.appVersion,
  });

  return cachedLogger;
}

export function withLogContext<T>(
  context: Partial<RequestContext>,
  fn: () => T
): T {
  const existing = getRequestContext();

  if (!existing) {
    if (!context.requestId) {
      return fn();
    }

    return runWithRequestContext(
      {
        requestId: context.requestId,
        ...context,
      },
      fn
    );
  }

  return runWithRequestContext(
    {
      ...existing,
      ...context,
      requestId: context?.requestId ?? existing.requestId,
    },
    fn
  );
}
