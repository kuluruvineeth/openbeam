import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type { AgentRunInput } from "../workflows/computer/agent-run";
import {
  approvalSignal,
  rejectionSignal,
} from "../workflows/computer/agent-run";

export interface StartComputerRunOptions {
  agentId: string;
  teamId: string;
  runId: string;
  agentName: string;
  triggerType: "SCHEDULE" | "MANUAL" | "WEBHOOK" | "API";
  triggeredByUser?: string;
  parameters?: Record<string, unknown>;
  approvalTimeoutMs?: number;
}

export interface ComputerRunHandle {
  workflowId: string;
  runId: string;
}

export async function startComputerRun(
  options: StartComputerRunOptions
): Promise<ComputerRunHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "computer",
    runId: options.runId,
  });

  const input: AgentRunInput = {
    agentId: options.agentId,
    teamId: options.teamId,
    triggerType: options.triggerType,
    triggeredByUser: options.triggeredByUser,
    parameters: options.parameters,
    notifyChannels: [],
    memoryEnabled: true,
    agentName: options.agentName,
    approvalTimeoutMs: options.approvalTimeoutMs,
  };

  try {
    const handle = await client.workflow.start("agentRunWorkflow", {
      taskQueue: TASK_QUEUES.COMPUTER,
      workflowId,
      args: [input],
      memo: {
        agentId: options.agentId,
        agentName: options.agentName,
        triggerType: options.triggerType,
      },
    });

    return {
      workflowId: handle.workflowId,
      runId: options.runId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { workflowId, runId: options.runId };
    }
    throw error;
  }
}

export async function signalComputerApproval(
  runId: string,
  approvedActions: Array<{
    tool: string;
    args: Record<string, unknown>;
    description?: string;
  }>,
  reviewedBy: string
): Promise<void> {
  const client = await getTemporalClient();
  const workflowId = generateWorkflowId({ type: "computer", runId });
  const handle = client.workflow.getHandle(workflowId);
  await handle.signal(approvalSignal, {
    approvedActions,
    reviewedBy,
  });
}

export async function signalComputerRejection(
  runId: string,
  reviewedBy: string,
  note?: string
): Promise<void> {
  const client = await getTemporalClient();
  const workflowId = generateWorkflowId({ type: "computer", runId });
  const handle = client.workflow.getHandle(workflowId);
  await handle.signal(rejectionSignal, {
    reviewedBy,
    note,
  });
}
