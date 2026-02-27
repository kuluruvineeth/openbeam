import { createLogger } from "@openplane/observability";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  teamId?: string;
  workflow?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

type LogTransport = (entry: LogEntry) => void;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LoggerConfig {
  minLevel: LogLevel;
  transports: LogTransport[];
  defaultContext: LogContext;
}

const baseLogger = createLogger({
  service: "openplane-analytics",
  env: process.env.NODE_ENV || "development",
  level: process.env.LOG_LEVEL || "info",
  version: process.env.APP_VERSION || "0.1.0",
});

const defaultConfig: LoggerConfig = {
  minLevel: "info",
  transports: [],
  defaultContext: {},
};

let globalConfig: LoggerConfig = { ...defaultConfig };

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[globalConfig.minLevel];
}

function formatError(error: Error): LogEntry["error"] {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context: LogContext = {},
  error?: Error
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: { ...globalConfig.defaultContext, ...context },
    error: error ? formatError(error) : undefined,
  };
}

function writeToBaseLogger(entry: LogEntry): void {
  const payload: Record<string, unknown> = {
    ...entry.context,
    timestamp: entry.timestamp,
  };

  if (entry.error) {
    payload.error = entry.error;
  }

  if (entry.level === "debug") {
    baseLogger.debug(payload, entry.message);
    return;
  }

  if (entry.level === "info") {
    baseLogger.info(payload, entry.message);
    return;
  }

  if (entry.level === "warn") {
    baseLogger.warn(payload, entry.message);
    return;
  }

  baseLogger.error(payload, entry.message);
}

function writeToTransports(entry: LogEntry): void {
  for (const transport of globalConfig.transports) {
    try {
      transport(entry);
    } catch (error) {
      baseLogger.warn(
        {
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : String(error),
        },
        "Analytics log transport failed"
      );
    }
  }
}

function emit(entry: LogEntry): void {
  writeToBaseLogger(entry);
  writeToTransports(entry);
}

export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = {
    ...globalConfig,
    ...config,
    defaultContext: {
      ...globalConfig.defaultContext,
      ...config.defaultContext,
    },
  };
}

export function addLogTransport(transport: LogTransport): void {
  globalConfig.transports.push(transport);
}

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(baseContext: LogContext): Logger;
}

function createChildLogger(baseContext: LogContext): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      logger.debug(message, { ...baseContext, ...context });
    },
    info(message: string, context?: LogContext): void {
      logger.info(message, { ...baseContext, ...context });
    },
    warn(message: string, context?: LogContext): void {
      logger.warn(message, { ...baseContext, ...context });
    },
    error(message: string, error?: Error, context?: LogContext): void {
      logger.error(message, error, { ...baseContext, ...context });
    },
    child(childContext: LogContext): Logger {
      return createChildLogger({ ...baseContext, ...childContext });
    },
  };
}

export const logger: Logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog("debug")) {
      return;
    }

    emit(createLogEntry("debug", message, context));
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog("info")) {
      return;
    }

    emit(createLogEntry("info", message, context));
  },

  warn(message: string, context?: LogContext): void {
    if (!shouldLog("warn")) {
      return;
    }

    emit(createLogEntry("warn", message, context));
  },

  error(message: string, error?: Error, context?: LogContext): void {
    if (!shouldLog("error")) {
      return;
    }

    emit(createLogEntry("error", message, context, error));
  },

  child(baseContext: LogContext): Logger {
    return createChildLogger(baseContext);
  },
};

export function createAILogger(options: {
  traceId: string;
  workflow: string;
  userId?: string;
  teamId?: string;
}): typeof logger {
  return logger.child({
    traceId: options.traceId,
    workflow: options.workflow,
    userId: options.userId,
    teamId: options.teamId,
  }) as typeof logger;
}

export function createRAGLogger(options: {
  traceId: string;
  userId: string;
  teamId?: string;
}): typeof logger {
  return logger.child({
    traceId: options.traceId,
    userId: options.userId,
    teamId: options.teamId,
    workflow: "rag",
  }) as typeof logger;
}

export function logAIGeneration(options: {
  traceId: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success: boolean;
  error?: Error;
}): void {
  const context: LogContext = {
    traceId: options.traceId,
    model: options.model,
    provider: options.provider,
    inputTokens: options.inputTokens,
    outputTokens: options.outputTokens,
    durationMs: options.durationMs,
  };

  if (options.success) {
    logger.info("AI generation completed", context);
    return;
  }

  logger.error("AI generation failed", options.error, context);
}

export function logToolCall(options: {
  traceId: string;
  tool: string;
  durationMs: number;
  success: boolean;
  error?: Error;
}): void {
  const context: LogContext = {
    traceId: options.traceId,
    tool: options.tool,
    durationMs: options.durationMs,
  };

  if (options.success) {
    logger.debug("Tool call completed", context);
    return;
  }

  logger.warn("Tool call failed", {
    ...context,
    error: options.error?.message,
  });
}

export function logRAGQuery(options: {
  traceId: string;
  queryHash: string;
  documentsRetrieved: number;
  chunksUsed: number;
  groundingScore?: number;
  totalMs: number;
  success: boolean;
}): void {
  logger.info("RAG query completed", {
    traceId: options.traceId,
    queryHash: options.queryHash,
    documentsRetrieved: options.documentsRetrieved,
    chunksUsed: options.chunksUsed,
    groundingScore: options.groundingScore,
    totalMs: options.totalMs,
    success: options.success,
  });
}

export function logSearchQuery(options: {
  queryId: string;
  searchType: string;
  resultCount: number;
  latencyMs: number;
  userId?: string;
}): void {
  logger.info("Search query executed", {
    queryId: options.queryId,
    searchType: options.searchType,
    resultCount: options.resultCount,
    latencyMs: options.latencyMs,
    userId: options.userId,
  });
}
