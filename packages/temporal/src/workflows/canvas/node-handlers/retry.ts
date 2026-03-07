import {
  type ExecutionPlanNode,
  type ExecutionTrace,
  RetryNodeConfigSchema,
} from "@openbeam/types/canvas";
import {
  ApplicationFailure,
  condition,
  sleep,
  workflowInfo,
} from "@temporalio/workflow";
import { currentTimestamp } from "../../temporal-utils";

import {
  buildCompletedStep,
  buildFailedStep,
  extractBranchId,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";
import {
  executeNoRetryActivities,
  updateActivities,
} from "../utils/activity-proxies";
import { resolveFailureMessage, shouldRetryFailure } from "../utils/errors";
import type { ExecutionContext } from "../utils/execution";
import { getWorkflowMetadata } from "../utils/execution";
import type { ExecutionGraph } from "../utils/graph";
import { resolveNextEdge } from "../utils/resolution";
import { resolveRetryDelayMs } from "../utils/retry";
import { resolveNodeConfig } from "../utils/type-guards";

export interface RetryHandlerParams {
  node: ExecutionPlanNode;
  currentPayload: unknown;
  lastStepOutput: unknown;
  trace: ExecutionTrace;
  startedAt: number;
  executionId: string;
  teamId: string;
  graph: ExecutionGraph;
  executionContext: ExecutionContext;
  state: { paused: boolean; cancelled: boolean };
}

export interface RetryResult {
  nextNodeId: string | null;
  output: unknown;
  cancelled: boolean;
}

function getTimestamp(): number {
  return currentTimestamp();
}

export async function handleRetryNode(
  params: RetryHandlerParams
): Promise<RetryResult> {
  const {
    node,
    currentPayload,
    lastStepOutput,
    trace,
    startedAt,
    executionId,
    teamId,
    graph,
    executionContext,
    state,
  } = params;

  const retryConfig = RetryNodeConfigSchema.parse(resolveNodeConfig(node.data));

  const resolveTargetParams = {
    node,
    edgesBySource: graph.edgesBySource,
    branchId: null,
  };
  const targetEdge = resolveNextEdge(resolveTargetParams);
  const targetNodeId = targetEdge.nextNodeId;

  if (!targetNodeId) {
    throw ApplicationFailure.nonRetryable(
      `Retry node ${node.id} has no target`,
      "CanvasExecutionPlanError"
    );
  }

  const targetNode = graph.nodesById.get(targetNodeId);
  if (!targetNode) {
    throw ApplicationFailure.nonRetryable(
      `Retry node ${node.id} target ${targetNodeId} not found`,
      "CanvasExecutionPlanError"
    );
  }

  const retryStartedAt = getTimestamp();
  const workflowMeta = workflowInfo();
  const seedBase = `${workflowMeta.workflowId}:${workflowMeta.runId}:${node.id}:${targetNode.id}`;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt += 1) {
    await condition(() => !state.paused || state.cancelled);

    if (state.cancelled) {
      return {
        nextNodeId: null,
        output: lastStepOutput,
        cancelled: true,
      };
    }

    const attemptStartedAt = getTimestamp();

    try {
      const result = await executeNoRetryActivities.executeCanvasNode({
        executionId,
        teamId,
        node: targetNode,
        input: currentPayload,
        context: executionContext,
      });

      const step = buildCompletedStep(targetNode, currentPayload, result);
      trace.steps.push(step);
      updateTraceForInput(trace, step);
      updateTraceForOutput(trace, step);
      trace.status = "RUNNING";
      trace.totalLatencyMs = result.completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId,
        teamId,
        status: "RUNNING",
        currentNodeId: targetNode.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      const retryStep = buildCompletedStep(node, currentPayload, {
        output: result.output,
        outputRef: result.outputRef,
        inputRef: result.inputRef,
        startedAt: retryStartedAt,
        completedAt: result.completedAt,
        latencyMs: result.completedAt - retryStartedAt,
      });
      trace.steps.push(retryStep);
      updateTraceForInput(trace, retryStep);
      updateTraceForOutput(trace, retryStep);
      trace.status = "RUNNING";
      trace.totalLatencyMs = result.completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId,
        teamId,
        status: "RUNNING",
        currentNodeId: node.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      const stepOutput = result.outputRef ?? result.output;
      const branchId =
        targetNode.type === "condition" ? extractBranchId(stepOutput) : null;

      const resolveParams = {
        node: targetNode,
        edgesBySource: graph.edgesBySource,
        branchId,
      };
      const nextNodeId = resolveNextEdge(resolveParams).nextNodeId;

      return { nextNodeId, output: stepOutput, cancelled: false };
    } catch (error) {
      const completedAt = getTimestamp();
      const message = resolveFailureMessage(error);
      const step = buildFailedStep({
        node: targetNode,
        input: currentPayload,
        error: message,
        startedAt: attemptStartedAt,
        completedAt,
      });
      trace.steps.push(step);
      updateTraceForInput(trace, step);
      trace.status = "RUNNING";
      trace.totalLatencyMs = completedAt - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId,
        teamId,
        status: "RUNNING",
        currentNodeId: targetNode.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });

      if (
        attempt >= retryConfig.maxAttempts ||
        !shouldRetryFailure(error, retryConfig)
      ) {
        throw error;
      }

      const delayMs = resolveRetryDelayMs({
        attempt,
        config: retryConfig,
        seed: `${seedBase}:${attempt}`,
      });
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  return { nextNodeId: null, output: lastStepOutput, cancelled: false };
}
