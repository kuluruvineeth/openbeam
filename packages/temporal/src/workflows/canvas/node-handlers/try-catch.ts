import {
  type ExecutionPlanNode,
  type ExecutionTrace,
  TryCatchNodeConfigSchema,
} from "@openbeam/types/canvas";
import { ApplicationFailure } from "@temporalio/workflow";
import { currentTimestamp } from "../../temporal-utils";

import {
  buildCompletedStep,
  buildFailedStep,
  extractBranchId,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";
import { executeActivities, updateActivities } from "../utils/activity-proxies";
import {
  resolveFailureDetails,
  resolveFailureMessage,
  shouldCatchFailure,
} from "../utils/errors";
import type { ExecutionContext } from "../utils/execution";
import { getWorkflowMetadata } from "../utils/execution";
import type { ExecutionGraph } from "../utils/graph";
import { resolveNextEdge } from "../utils/resolution";
import { resolveNodeConfig } from "../utils/type-guards";

export interface TryCatchHandlerParams {
  node: ExecutionPlanNode;
  currentPayload: unknown;
  trace: ExecutionTrace;
  startedAt: number;
  executionId: string;
  teamId: string;
  graph: ExecutionGraph;
  executionContext: ExecutionContext;
}

export interface TryCatchResult {
  nextNodeId: string | null;
  output: unknown;
  cancelled: boolean;
}

function getTimestamp(): number {
  return currentTimestamp();
}

export async function handleTryCatchNode(
  params: TryCatchHandlerParams
): Promise<TryCatchResult> {
  const {
    node,
    currentPayload,
    trace,
    startedAt,
    executionId,
    teamId,
    graph,
    executionContext,
  } = params;

  const tryCatchConfig = TryCatchNodeConfigSchema.parse(
    resolveNodeConfig(node.data)
  );
  const outboundEdges = graph.edgesBySource.get(node.id) ?? [];
  const tryEdge = outboundEdges.find((edge) => edge.sourceHandle === "try");
  const catchEdge = outboundEdges.find((edge) => edge.sourceHandle === "catch");

  if (!(tryEdge && catchEdge)) {
    throw ApplicationFailure.nonRetryable(
      `Try/catch node ${node.id} is missing try or catch branch`,
      "CanvasExecutionPlanError"
    );
  }

  const tryNode = graph.nodesById.get(tryEdge.target);
  const catchNode = graph.nodesById.get(catchEdge.target);

  if (!(tryNode && catchNode)) {
    throw ApplicationFailure.nonRetryable(
      `Try/catch node ${node.id} targets invalid nodes`,
      "CanvasExecutionPlanError"
    );
  }

  const tryCatchStartedAt = getTimestamp();

  try {
    const result = await executeActivities.executeCanvasNode({
      executionId,
      teamId,
      node: tryNode,
      input: currentPayload,
      context: executionContext,
    });

    const tryStep = buildCompletedStep(tryNode, currentPayload, result);
    trace.steps.push(tryStep);
    updateTraceForInput(trace, tryStep);
    updateTraceForOutput(trace, tryStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = result.completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId,
      teamId,
      status: "RUNNING",
      currentNodeId: tryNode.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    const tryOutput = result.outputRef ?? result.output;
    const tryCatchStep = buildCompletedStep(node, currentPayload, {
      output: tryOutput,
      startedAt: tryCatchStartedAt,
      completedAt: result.completedAt,
      latencyMs: result.completedAt - tryCatchStartedAt,
    });
    trace.steps.push(tryCatchStep);
    updateTraceForInput(trace, tryCatchStep);
    updateTraceForOutput(trace, tryCatchStep);
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

    const branchId =
      tryNode.type === "condition" ? extractBranchId(tryOutput) : null;

    const resolveParams = {
      node: tryNode,
      edgesBySource: graph.edgesBySource,
      branchId,
    };
    const nextNodeId = resolveNextEdge(resolveParams).nextNodeId;

    return { nextNodeId, output: tryOutput, cancelled: false };
  } catch (error) {
    const completedAt = getTimestamp();
    const message = resolveFailureMessage(error);
    const failedStep = buildFailedStep({
      node: tryNode,
      input: currentPayload,
      error: message,
      startedAt: tryCatchStartedAt,
      completedAt,
    });
    trace.steps.push(failedStep);
    updateTraceForInput(trace, failedStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId,
      teamId,
      status: "RUNNING",
      currentNodeId: tryNode.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    if (!shouldCatchFailure(error, tryCatchConfig)) {
      throw error;
    }

    const failureDetails = resolveFailureDetails(error);
    const catchInput = tryCatchConfig.logErrors
      ? {
          error: {
            message,
            name: failureDetails.name,
            type: failureDetails.type,
          },
          input: currentPayload,
          nodeId: tryNode.id,
          nodeType: tryNode.type,
        }
      : { input: currentPayload, nodeId: tryNode.id, nodeType: tryNode.type };

    const catchResult = await executeActivities.executeCanvasNode({
      executionId,
      teamId,
      node: catchNode,
      input: catchInput,
      context: executionContext,
    });

    const catchStep = buildCompletedStep(catchNode, catchInput, catchResult);
    trace.steps.push(catchStep);
    updateTraceForInput(trace, catchStep);
    updateTraceForOutput(trace, catchStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = catchResult.completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId,
      teamId,
      status: "RUNNING",
      currentNodeId: catchNode.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    const catchOutput = catchResult.outputRef ?? catchResult.output;
    const resolvedCatchOutput =
      catchOutput === undefined && tryCatchConfig.fallbackValue !== undefined
        ? tryCatchConfig.fallbackValue
        : catchOutput;

    const tryCatchStep = buildCompletedStep(node, currentPayload, {
      output: resolvedCatchOutput,
      startedAt: tryCatchStartedAt,
      completedAt: catchResult.completedAt,
      latencyMs: catchResult.completedAt - tryCatchStartedAt,
    });
    trace.steps.push(tryCatchStep);
    updateTraceForInput(trace, tryCatchStep);
    updateTraceForOutput(trace, tryCatchStep);
    trace.status = "RUNNING";
    trace.totalLatencyMs = catchResult.completedAt - startedAt;

    await updateActivities.updateCanvasExecution({
      executionId,
      teamId,
      status: "RUNNING",
      currentNodeId: node.id,
      trace,
      latencyMs: trace.totalLatencyMs,
      ...getWorkflowMetadata("RUNNING"),
    });

    const branchId =
      catchNode.type === "condition" ? extractBranchId(catchOutput) : null;

    const resolveParams = {
      node: catchNode,
      edgesBySource: graph.edgesBySource,
      branchId,
    };
    const nextNodeId = resolveNextEdge(resolveParams).nextNodeId;

    return { nextNodeId, output: resolvedCatchOutput, cancelled: false };
  }
}
