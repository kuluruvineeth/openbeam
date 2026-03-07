import type { ExecutionPlanNode } from "@openbeam/types/canvas";
import { InputNodeConfigSchema } from "@openbeam/types/canvas";
import type { CanvasInputSignalPayload } from "@openbeam/types/temporal";
import { condition } from "@temporalio/workflow";
import { conditionWithTimeout, currentTimestamp } from "../../temporal-utils";
import {
  buildWaitingStep,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";
import { getWorkflowMetadata } from "../utils/execution";
import { resolveNextEdge } from "../utils/resolution";
import { resolveNodeConfig } from "../utils/type-guards";
import type { NodeExecutionResult, NodeHandlerContext } from "./types";

function getTimestamp(): number {
  return currentTimestamp();
}

async function waitForInputResponse(params: {
  nodeId: string;
  timeoutMs?: number;
  inputResponses: Map<string, CanvasInputSignalPayload>;
  isCancelled: () => boolean;
}): Promise<{
  response?: CanvasInputSignalPayload;
  timedOut: boolean;
  cancelled: boolean;
}> {
  const hasResponse = () => params.inputResponses.has(params.nodeId);

  if (params.timeoutMs && params.timeoutMs > 0) {
    const signaled = await conditionWithTimeout(
      () => params.isCancelled() || hasResponse(),
      params.timeoutMs
    );
    if (!signaled) {
      return { timedOut: true, cancelled: false };
    }
  } else {
    await condition(() => params.isCancelled() || hasResponse());
  }

  if (params.isCancelled()) {
    return { timedOut: false, cancelled: true };
  }

  const response = params.inputResponses.get(params.nodeId);
  if (response) {
    params.inputResponses.delete(params.nodeId);
  }

  return { response, timedOut: false, cancelled: false };
}

export async function executeInputNode(
  node: ExecutionPlanNode,
  currentPayload: unknown,
  context: NodeHandlerContext
): Promise<NodeExecutionResult> {
  const {
    trace,
    startedAt,
    input,
    activities,
    edgesBySource,
    state,
    inputResponses,
  } = context;

  const inputConfig = InputNodeConfigSchema.parse(resolveNodeConfig(node.data));
  const stepStartedAt = getTimestamp();

  const stepResult = await activities.createStep({
    executionId: input.executionId,
    teamId: input.teamId,
    node,
    input: currentPayload,
    status: "WAITING_INPUT",
    startedAt: stepStartedAt,
  });

  const waitingStep = buildWaitingStep({
    node,
    input: currentPayload,
    inputRef: stepResult.inputRef,
    status: "WAITING_INPUT",
    startedAt: stepStartedAt,
  });

  trace.steps.push(waitingStep);
  updateTraceForInput(trace, waitingStep);
  trace.status = "WAITING_INPUT";
  trace.totalLatencyMs = stepStartedAt - startedAt;

  await activities.updateExecution({
    executionId: input.executionId,
    teamId: input.teamId,
    status: "WAITING_INPUT",
    currentNodeId: node.id,
    trace,
    latencyMs: trace.totalLatencyMs,
    ...getWorkflowMetadata("WAITING_INPUT"),
  });

  const responseResult = await waitForInputResponse({
    nodeId: node.id,
    timeoutMs: inputConfig.timeoutMs,
    inputResponses,
    isCancelled: () => state.cancelled,
  });

  if (responseResult.cancelled) {
    return { nextNodeId: null, output: currentPayload, cancelled: true };
  }

  const applyDefaults = (inputValues: Record<string, unknown>) => {
    const resolved = { ...inputValues };
    for (const field of inputConfig.fields) {
      if (
        resolved[field.id] === undefined &&
        field.defaultValue !== undefined
      ) {
        resolved[field.id] = field.defaultValue;
      }
    }
    return resolved;
  };

  const resolveTimeoutDefaults = () => {
    const defaults: Record<string, unknown> = {};
    const missing: string[] = [];
    for (const field of inputConfig.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      } else if (field.validation?.required) {
        missing.push(field.id);
      }
    }
    return { values: defaults, missing };
  };

  const failInputNode = async (message: string): Promise<never> => {
    const completedAt = getTimestamp();
    await activities.updateStep({
      executionId: input.executionId,
      teamId: input.teamId,
      stepId: stepResult.stepId,
      nodeId: node.id,
      status: "FAILED",
      error: message,
      completedAt,
      latencyMs: completedAt - stepStartedAt,
    });
    waitingStep.status = "FAILED";
    waitingStep.error = message;
    waitingStep.completedAt = completedAt;
    waitingStep.latencyMs = completedAt - stepStartedAt;
    throw new Error(message);
  };

  let submittedValues: Record<string, unknown> | undefined;
  let skipped = false;
  const timedOut = responseResult.timedOut;

  if (responseResult.timedOut) {
    if (inputConfig.timeoutAction === "error") {
      await failInputNode(`Input node ${node.id} timed out`);
    }

    if (inputConfig.timeoutAction === "default") {
      const defaults = resolveTimeoutDefaults();
      if (defaults.missing.length > 0) {
        await failInputNode(
          `Input node ${node.id} missing defaults for required fields`
        );
      }
      submittedValues = defaults.values;
    } else if (inputConfig.timeoutAction === "skip") {
      if (!inputConfig.allowSkip) {
        await failInputNode(
          `Input node ${node.id} cannot skip without allowSkip`
        );
      }
      skipped = true;
    }
  } else {
    const response = responseResult.response;
    if (!response) {
      await failInputNode(`Input node ${node.id} response missing`);
    }

    skipped = response?.skipped ?? false;

    if (skipped) {
      if (!inputConfig.allowSkip) {
        await failInputNode(
          `Input node ${node.id} cannot skip without allowSkip`
        );
      }
    } else {
      const responseValues = response?.values;
      if (
        !responseValues ||
        typeof responseValues !== "object" ||
        Array.isArray(responseValues)
      ) {
        await failInputNode(`Input node ${node.id} values missing`);
      }
      submittedValues = responseValues as Record<string, unknown>;
    }
  }

  if (!skipped && submittedValues) {
    submittedValues = applyDefaults(submittedValues);
  }

  const completedAt = getTimestamp();
  const stepOutput = {
    input: currentPayload,
    values: submittedValues,
    skipped,
  };

  const stepStatus = timedOut ? "TIMED_OUT" : "COMPLETED";

  const stepUpdate = await activities.updateStep({
    executionId: input.executionId,
    teamId: input.teamId,
    stepId: stepResult.stepId,
    nodeId: node.id,
    status: stepStatus,
    output: stepOutput,
    completedAt,
    latencyMs: completedAt - stepStartedAt,
  });

  waitingStep.status = stepStatus;
  waitingStep.output = stepUpdate.outputRef ? undefined : stepUpdate.output;
  waitingStep.outputRef = stepUpdate.outputRef;
  waitingStep.completedAt = completedAt;
  waitingStep.latencyMs = completedAt - stepStartedAt;
  updateTraceForOutput(trace, waitingStep);
  trace.status = "RUNNING";
  trace.totalLatencyMs = completedAt - startedAt;

  await activities.updateExecution({
    executionId: input.executionId,
    teamId: input.teamId,
    status: "RUNNING",
    currentNodeId: node.id,
    trace,
    latencyMs: trace.totalLatencyMs,
    ...getWorkflowMetadata("RUNNING"),
  });

  let branchId: string | null = null;
  if (inputConfig.allowSkip) {
    branchId = skipped ? "skipped" : "data";
  }

  const nextNodeId = resolveNextEdge({
    node,
    edgesBySource,
    branchId,
  }).nextNodeId;

  return {
    nextNodeId,
    output: stepOutput,
    cancelled: false,
  };
}
