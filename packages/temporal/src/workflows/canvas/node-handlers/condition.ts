import type { ExecutionPlanNode } from "@openbeam/types/canvas";
import {
  buildCompletedStep,
  extractBranchId,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";
import { getWorkflowMetadata } from "../utils/execution";
import { resolveNextEdge } from "../utils/resolution";
import type { NodeExecutionResult, NodeHandlerContext } from "./types";

export async function executeConditionNode(
  node: ExecutionPlanNode,
  currentPayload: unknown,
  context: NodeHandlerContext
): Promise<NodeExecutionResult> {
  const {
    executionContext,
    trace,
    startedAt,
    input,
    activities,
    edgesBySource,
  } = context;

  const result = await activities.executeNode({
    executionId: input.executionId,
    teamId: input.teamId,
    node,
    input: currentPayload,
    context: executionContext,
  });

  const step = buildCompletedStep(node, currentPayload, result);
  trace.steps.push(step);
  updateTraceForInput(trace, step);
  updateTraceForOutput(trace, step);
  trace.status = "RUNNING";
  trace.totalLatencyMs = result.completedAt - startedAt;

  await activities.updateExecution({
    executionId: input.executionId,
    teamId: input.teamId,
    status: "RUNNING",
    currentNodeId: node.id,
    trace,
    latencyMs: trace.totalLatencyMs,
    ...getWorkflowMetadata("RUNNING"),
  });

  const stepOutput = result.outputRef ?? result.output;
  const branchId = extractBranchId(stepOutput);
  const nextNodeId = resolveNextEdge({
    node,
    edgesBySource,
    branchId,
  }).nextNodeId;

  return {
    nextNodeId,
    output: currentPayload,
    cancelled: false,
  };
}
