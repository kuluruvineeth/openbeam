import { trace } from "@opentelemetry/api";
import { activityInfo } from "@temporalio/activity";
import { workflowInfo } from "@temporalio/workflow";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface TraceContext {
  traceId?: string;
  spanId?: string;
  traceFlags?: number;
}

interface WorkflowContext {
  workflowId?: string;
  runId?: string;
  workflowType?: string;
  taskQueue?: string;
  namespace?: string;
}

interface ActivityContextInfo {
  activityId?: string;
  activityType?: string;
  attempt?: number;
  isLocal?: boolean;
}

interface CanvasContext {
  executionId?: string;
  nodeId?: string;
  teamId?: string;
  userId?: string;
}

export interface LogContext
  extends TraceContext,
    WorkflowContext,
    ActivityContextInfo,
    CanvasContext {
  component?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  extra?: Record<string, unknown>;
}

export interface LoggerConfig {
  level?: LogLevel;
  component?: string;
  format?: "json" | "text";
  includeTimestamp?: boolean;
}

function getTraceContext(): TraceContext {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();

  if (!spanContext) {
    return {};
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags,
  };
}

function getWorkflowContextSafe(): WorkflowContext {
  try {
    const info = workflowInfo();
    return {
      workflowId: info.workflowId,
      runId: info.runId,
      workflowType: info.workflowType,
      taskQueue: info.taskQueue,
      namespace: info.namespace,
    };
  } catch {
    return {};
  }
}

function getActivityContextSafe(): ActivityContextInfo & WorkflowContext {
  try {
    const info = activityInfo();
    return {
      activityId: info.activityId,
      activityType: info.activityType,
      attempt: info.attempt,
      isLocal: info.isLocal,
      workflowId: info.workflowExecution.workflowId,
      runId: info.workflowExecution.runId,
      workflowType: info.workflowType,
      taskQueue: info.taskQueue,
    };
  } catch {
    return {};
  }
}

function shouldLog(configLevel: LogLevel, messageLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[configLevel];
}

function formatLogEntry(entry: LogEntry, format: "json" | "text"): string {
  if (format === "json") {
    return JSON.stringify(entry);
  }

  const levelStr = entry.level.toUpperCase().padEnd(5);
  const contextStr = Object.entries(entry.context)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");

  const extraStr = entry.extra
    ? Object.entries(entry.extra)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(" ")
    : "";

  return `[${entry.timestamp}] [${levelStr}] ${entry.message} ${contextStr} ${extraStr}`.trim();
}

function createLogEntry(
  level: LogLevel,
  message: string,
  ctx: LogContext,
  extra?: Record<string, unknown>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: ctx,
    extra,
  };
}

export interface Logger {
  debug(message: string, extra?: Record<string, unknown>): void;
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
  child(additionalContext: Partial<LogContext>): Logger;
}

function createLoggerImpl(
  config: Required<LoggerConfig>,
  baseContext: LogContext
): Logger {
  const log = (
    level: LogLevel,
    message: string,
    extra?: Record<string, unknown>
  ): void => {
    if (!shouldLog(config.level, level)) {
      return;
    }

    const traceCtx = getTraceContext();
    const ctx: LogContext = {
      ...baseContext,
      ...traceCtx,
      component: config.component,
    };

    const entry = createLogEntry(level, message, ctx, extra);
    const formatted = formatLogEntry(entry, config.format);

    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
      default:
        console.log(formatted);
        break;
    }
  };

  return {
    debug: (message, extra) => log("debug", message, extra),
    info: (message, extra) => log("info", message, extra),
    warn: (message, extra) => log("warn", message, extra),
    error: (message, extra) => log("error", message, extra),
    child: (additionalContext) =>
      createLoggerImpl(config, { ...baseContext, ...additionalContext }),
  };
}

export function createLogger(config: LoggerConfig = {}): Logger {
  const fullConfig: Required<LoggerConfig> = {
    level: config.level ?? "info",
    component: config.component ?? "temporal",
    format: config.format ?? "json",
    includeTimestamp: config.includeTimestamp ?? true,
  };

  return createLoggerImpl(fullConfig, {});
}

export function createWorkflowLogger(
  baseContext: Partial<CanvasContext> = {},
  config: LoggerConfig = {}
): Logger {
  const fullConfig: Required<LoggerConfig> = {
    level: config.level ?? "info",
    component: config.component ?? "temporal-workflow",
    format: config.format ?? "json",
    includeTimestamp: config.includeTimestamp ?? true,
  };

  const workflowCtx = getWorkflowContextSafe();

  return createLoggerImpl(fullConfig, {
    ...workflowCtx,
    ...baseContext,
  });
}

export function createActivityLogger(
  baseContext: Partial<CanvasContext> = {},
  config: LoggerConfig = {}
): Logger {
  const fullConfig: Required<LoggerConfig> = {
    level: config.level ?? "info",
    component: config.component ?? "temporal-activity",
    format: config.format ?? "json",
    includeTimestamp: config.includeTimestamp ?? true,
  };

  const activityCtx = getActivityContextSafe();

  return createLoggerImpl(fullConfig, {
    ...activityCtx,
    ...baseContext,
  });
}

export interface CanvasLoggerContext {
  executionId: string;
  teamId: string;
  nodeId?: string;
  userId?: string;
}

export function createCanvasActivityLogger(
  canvasContext: CanvasLoggerContext,
  config: LoggerConfig = {}
): Logger {
  const fullConfig: Required<LoggerConfig> = {
    level: config.level ?? "info",
    component: config.component ?? "canvas-activity",
    format: config.format ?? "json",
    includeTimestamp: config.includeTimestamp ?? true,
  };

  const activityCtx = getActivityContextSafe();

  return createLoggerImpl(fullConfig, {
    ...activityCtx,
    executionId: canvasContext.executionId,
    teamId: canvasContext.teamId,
    nodeId: canvasContext.nodeId,
    userId: canvasContext.userId,
  });
}

export function createCanvasWorkflowLogger(
  canvasContext: CanvasLoggerContext,
  config: LoggerConfig = {}
): Logger {
  const fullConfig: Required<LoggerConfig> = {
    level: config.level ?? "info",
    component: config.component ?? "canvas-workflow",
    format: config.format ?? "json",
    includeTimestamp: config.includeTimestamp ?? true,
  };

  const workflowCtx = getWorkflowContextSafe();

  return createLoggerImpl(fullConfig, {
    ...workflowCtx,
    executionId: canvasContext.executionId,
    teamId: canvasContext.teamId,
    nodeId: canvasContext.nodeId,
    userId: canvasContext.userId,
  });
}

export type { LogLevel };
