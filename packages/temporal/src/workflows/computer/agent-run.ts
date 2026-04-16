import {
  defineSignal,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { ComputerActivities } from "../../activities/computer";
import { conditionWithTimeout } from "../temporal-utils";

interface ApprovalSignalData {
  approvedActions: Array<{
    tool: string;
    args: Record<string, unknown>;
    description?: string;
  }>;
  reviewedBy: string;
}

interface RejectionSignalData {
  reviewedBy: string;
  note?: string;
}

export interface AgentRunInput {
  agentId: string;
  teamId: string;
  triggerType: "SCHEDULE" | "MANUAL" | "WEBHOOK" | "API";
  triggeredByUser?: string;
  parameters?: Record<string, unknown>;
  notifyChannels: string[];
  memoryEnabled: boolean;
  agentName: string;
  approvalTimeoutMs?: number;
}

export interface AgentRunResult {
  runId: string;
  status: "COMPLETED" | "FAILED" | "TIMED_OUT";
}

export const approvalSignal =
  defineSignal<[ApprovalSignalData]>("computerApproval");
export const rejectionSignal =
  defineSignal<[RejectionSignalData]>("computerRejection");

const executeActivities = proxyActivities<ComputerActivities>({
  startToCloseTimeout: "30m",
  heartbeatTimeout: "2m",
  retry: { maximumAttempts: 1 },
});

const shortActivities = proxyActivities<ComputerActivities>({
  startToCloseTimeout: "1m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1s",
    backoffCoefficient: 2,
  },
});

interface RunState {
  approvalData: ApprovalSignalData | null;
  rejectionData: RejectionSignalData | null;
  decided: boolean;
}

export async function agentRunWorkflow(
  input: AgentRunInput
): Promise<AgentRunResult> {
  const state: RunState = {
    approvalData: null,
    rejectionData: null,
    decided: false,
  };

  setHandler(approvalSignal, (data: ApprovalSignalData) => {
    if (!state.decided) {
      state.approvalData = data;
      state.decided = true;
    }
  });

  setHandler(rejectionSignal, (data: RejectionSignalData) => {
    if (!state.decided) {
      state.rejectionData = data;
      state.decided = true;
    }
  });

  const runId = await shortActivities.createAndClaimRun({
    agentId: input.agentId,
    teamId: input.teamId,
    triggeredBy: input.triggerType,
    triggeredByUser: input.triggeredByUser,
  });

  await shortActivities.setRunWorkflowId({
    runId,
    workflowId: workflowInfo().workflowId,
  });

  const claimed = await shortActivities.claimRun({
    runId,
    agentId: input.agentId,
  });

  if (!claimed) {
    await shortActivities.expireRun({
      runId,
      reason: "skipped_concurrent",
    });
    return { runId, status: "FAILED" };
  }

  const result = await executeActivities.executeComputerAgent({
    agentId: input.agentId,
    teamId: input.teamId,
    runId,
    triggerType: input.triggerType,
    parameters: input.parameters,
  });

  if (result.proposalSubmitted) {
    const gotDecision = await conditionWithTimeout(
      () => state.decided,
      input.approvalTimeoutMs ?? 24 * 60 * 60 * 1000
    );

    if (!gotDecision) {
      await shortActivities.expireRun({
        runId,
        reason: "approval_timeout",
      });
      return { runId, status: "TIMED_OUT" };
    }

    if (state.rejectionData) {
      await shortActivities.rejectRun({ runId });
      return { runId, status: "FAILED" };
    }

    const replayResult = await executeActivities.replayApprovedActions({
      runId,
      agentId: input.agentId,
      teamId: input.teamId,
      actions: state.approvalData?.approvedActions ?? [],
    });

    await shortActivities.completeOrFailRun({
      runId,
      success: replayResult.success,
      summary:
        typeof replayResult.result === "string" ? replayResult.result : null,
      error: replayResult.error ?? null,
      toolCallCount: result.toolCallCount + replayResult.toolCallCount,
      llmCallCount: result.llmCallCount + replayResult.llmCallCount,
    });

    return { runId, status: replayResult.success ? "COMPLETED" : "FAILED" };
  }

  await shortActivities.completeOrFailRun({
    runId,
    success: result.success,
    summary: typeof result.result === "string" ? result.result : null,
    error: result.error ?? null,
    toolCallCount: result.toolCallCount,
    llmCallCount: result.llmCallCount,
  });

  return { runId, status: result.success ? "COMPLETED" : "FAILED" };
}
