import type { ExecutionPlanNode } from "@openplane/types/canvas";
import { ApprovalNodeConfigSchema } from "@openplane/types/canvas";
import type { CanvasApprovalSignalPayload } from "@openplane/types/temporal";
import { condition, workflowInfo } from "@temporalio/workflow";
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
  return workflowInfo().startTime.getTime();
}

async function waitForApprovalResponse(params: {
  approvalId: string;
  timeoutMs?: number;
  approvalResponses: Map<string, CanvasApprovalSignalPayload>;
  cancelled: boolean;
}): Promise<{
  response?: CanvasApprovalSignalPayload;
  timedOut: boolean;
  cancelled: boolean;
}> {
  const hasResponse = () => params.approvalResponses.has(params.approvalId);

  if (params.timeoutMs && params.timeoutMs > 0) {
    const signaled = await condition(
      () => params.cancelled || hasResponse(),
      params.timeoutMs
    );
    if (!signaled) {
      return { timedOut: true, cancelled: false };
    }
  } else {
    await condition(() => params.cancelled || hasResponse());
  }

  if (params.cancelled) {
    return { timedOut: false, cancelled: true };
  }

  const response = params.approvalResponses.get(params.approvalId);
  if (response) {
    params.approvalResponses.delete(params.approvalId);
  }

  return { response, timedOut: false, cancelled: false };
}

export async function executeApprovalNode(
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
    approvalResponses,
  } = context;

  const approvalConfig = ApprovalNodeConfigSchema.parse(
    resolveNodeConfig(node.data)
  );
  const stepStartedAt = getTimestamp();

  const stepResult = await activities.createStep({
    executionId: input.executionId,
    teamId: input.teamId,
    node,
    input: currentPayload,
    status: "WAITING_APPROVAL",
    startedAt: stepStartedAt,
  });

  const approvalRecord = await activities.createApproval({
    executionId: input.executionId,
    teamId: input.teamId,
    nodeId: node.id,
    requestMessage: approvalConfig.message,
    timeoutMs: approvalConfig.timeoutMs,
  });

  const waitingStep = buildWaitingStep({
    node,
    input: currentPayload,
    inputRef: stepResult.inputRef,
    status: "WAITING_APPROVAL",
    startedAt: stepStartedAt,
  });

  trace.steps.push(waitingStep);
  updateTraceForInput(trace, waitingStep);
  trace.status = "WAITING_APPROVAL";
  trace.totalLatencyMs = stepStartedAt - startedAt;

  await activities.updateExecution({
    executionId: input.executionId,
    teamId: input.teamId,
    status: "WAITING_APPROVAL",
    currentNodeId: node.id,
    trace,
    latencyMs: trace.totalLatencyMs,
    ...getWorkflowMetadata("WAITING_APPROVAL"),
  });

  const approvalWait = await waitForApprovalResponse({
    approvalId: approvalRecord.approvalId,
    timeoutMs: approvalConfig.timeoutMs,
    approvalResponses,
    cancelled: state.cancelled,
  });

  if (approvalWait.cancelled) {
    return { nextNodeId: null, output: currentPayload, cancelled: true };
  }

  const completedAt = getTimestamp();
  let resolvedStatus: "APPROVED" | "REJECTED";

  if (approvalWait.timedOut) {
    resolvedStatus =
      approvalConfig.timeoutAction === "approve" ? "APPROVED" : "REJECTED";
  } else if (approvalWait.response?.status) {
    resolvedStatus = approvalWait.response.status;
  } else {
    resolvedStatus = "REJECTED";
  }
  const branchId = resolvedStatus === "APPROVED" ? "approved" : "rejected";

  const stepOutput = {
    input: currentPayload,
    approval: {
      approvalId: approvalRecord.approvalId,
      status: resolvedStatus,
      responseMessage: approvalWait.response?.responseMessage,
      respondedById: approvalWait.response?.respondedById,
      respondedAt: approvalWait.response?.timestamp ?? completedAt,
      timedOut: approvalWait.timedOut,
    },
  };

  const stepStatus = approvalWait.timedOut ? "TIMED_OUT" : "COMPLETED";

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

  const nextNodeId = resolveNextEdge({
    node,
    edgesBySource,
    branchId,
  }).nextNodeId;

  return { nextNodeId, output: currentPayload, cancelled: false };
}
