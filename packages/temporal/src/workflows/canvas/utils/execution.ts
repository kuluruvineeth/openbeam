import type { ExecutionPlan, ExecutionStatus } from "@openbeam/types/canvas";
import { workflowInfo } from "@temporalio/workflow";

export type TaskResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown }
  | { status: "skipped"; reason: string };

export interface WorkflowMetadata {
  workflowId: string;
  runId: string;
  temporalStatus: ExecutionStatus;
  historyEventCount: number;
  historySizeBytes: number;
}

export interface ExecutionContext {
  executionId: string;
  agentCanvasId: string;
  versionNumber: number;
  teamId: string;
  triggeredById: string;
  triggerSource?: string;
  workflowId?: string;
  runId?: string;
  input?: unknown;
  inputRef?: {
    id: string;
    storage: "db";
    sizeBytes?: number;
    contentType?: string;
  };
  environment?: Record<string, string>;
}

export function getWorkflowMetadata(status: ExecutionStatus): WorkflowMetadata {
  const info = workflowInfo();

  return {
    workflowId: info.workflowId,
    runId: info.runId,
    temporalStatus: status,
    historyEventCount: info.historyLength,
    historySizeBytes: info.historySize,
  };
}

export function buildExecutionContext(params: {
  executionId: string;
  agentCanvasId: string;
  versionNumber: number;
  teamId: string;
  triggeredById: string;
  triggerSource?: string;
  input?: unknown;
  inputRef?: ExecutionContext["inputRef"];
  environment?: Record<string, string>;
}): ExecutionContext {
  const workflowMeta = workflowInfo();

  return {
    executionId: params.executionId,
    agentCanvasId: params.agentCanvasId,
    versionNumber: params.versionNumber,
    teamId: params.teamId,
    triggeredById: params.triggeredById,
    triggerSource: params.triggerSource,
    workflowId: workflowMeta.workflowId,
    runId: workflowMeta.runId,
    input: params.input,
    inputRef: params.inputRef,
    environment: params.environment,
  };
}

export async function runTasksWithConcurrency<T>(params: {
  tasks: Array<() => Promise<T>>;
  maxConcurrency: number;
  stopOnError: boolean;
}): Promise<TaskResult<T>[]> {
  const { tasks, maxConcurrency, stopOnError } = params;
  if (tasks.length === 0) {
    return [];
  }

  const results: TaskResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;
  let active = 0;
  let stopped = false;

  return await new Promise((resolve) => {
    const finalize = () => {
      if (stopped) {
        for (let i = nextIndex; i < tasks.length; i += 1) {
          results[i] = {
            status: "skipped",
            reason: "Skipped after failure",
          };
        }
      }
      resolve(results);
    };

    const launch = () => {
      if (stopped && active === 0) {
        finalize();
        return;
      }

      while (!stopped && active < maxConcurrency && nextIndex < tasks.length) {
        const index = nextIndex;
        nextIndex += 1;
        active += 1;

        const task = tasks[index];
        if (!task) {
          results[index] = {
            status: "rejected",
            reason: new Error("Task not found"),
          };
          active -= 1;
          if (stopOnError) {
            stopped = true;
          }
          if (active === 0 && (stopped || nextIndex >= tasks.length)) {
            finalize();
          }
          continue;
        }

        task()
          .then((value) => {
            results[index] = { status: "fulfilled", value };
          })
          .catch((reason) => {
            results[index] = { status: "rejected", reason };
            if (stopOnError) {
              stopped = true;
            }
          })
          .finally(() => {
            active -= 1;
            if (active === 0 && (stopped || nextIndex >= tasks.length)) {
              finalize();
            } else {
              launch();
            }
          });
      }

      if (active === 0 && nextIndex >= tasks.length) {
        finalize();
      }
    };

    launch();
  });
}

export function resolveNodeInput(
  nodeId: string,
  outputs: Map<string, unknown>,
  edgesByTarget: Map<string, ExecutionPlan["edges"]>
): unknown {
  const inboundEdges = edgesByTarget.get(nodeId) ?? [];

  if (inboundEdges.length === 0) {
    return;
  }

  if (inboundEdges.length === 1) {
    const sourceId = inboundEdges[0]?.source;
    if (sourceId) {
      return outputs.get(sourceId);
    }
    return;
  }

  const merged: Record<string, unknown> = {};
  for (const edge of inboundEdges) {
    const output = outputs.get(edge.source);
    if (output !== undefined) {
      merged[edge.source] = output;
    }
  }

  return merged;
}

export function mergeNodeOutputs(
  outputs: Map<string, unknown>,
  predecessorIds: string[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const predId of predecessorIds) {
    const output = outputs.get(predId);
    if (output !== undefined) {
      merged[predId] = output;
    }
  }

  return merged;
}

const TEMPLATE_PATTERN = /\{\{\s*([\w.[\]]+)\s*\}\}/g;
const PATH_SPLIT_PATTERN = /[.[\]]+/;

export function resolveTemplateVariables(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(TEMPLATE_PATTERN, (_match, path) => {
    const value = resolvePath(context, path);
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  });
}

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split(PATH_SPLIT_PATTERN).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return;
    }
    if (typeof current !== "object") {
      return;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function resolveExpression(
  expression: string,
  context: Record<string, unknown>
): unknown {
  const trimmed = expression.trim();

  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
    const path = trimmed.slice(2, -2).trim();
    return resolvePath(context, path);
  }

  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null") {
    return null;
  }

  const num = Number(trimmed);
  if (!Number.isNaN(num)) {
    return num;
  }

  return resolveTemplateVariables(trimmed, context);
}
