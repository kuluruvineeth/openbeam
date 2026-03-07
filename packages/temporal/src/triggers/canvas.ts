import type { CanvasState } from "@openbeam/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
} from "@openbeam/types/temporal";
import type {
  AgentCanvasExecutionInput,
  AgentCanvasExecutionOutput,
} from "@openbeam/types/temporal/workflows";
import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
} from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import {
  type CanvasExecutionQueryState,
  cancelSignal,
  canvasApprovalSignal,
  canvasExecutionQuery,
  canvasInputSignal,
  pauseSignal,
  resumeSignal,
} from "../workflows/types";

export interface StartCanvasExecutionOptions {
  executionId: string;
  agentCanvasId: string;
  versionNumber: number;
  teamId: string;
  triggeredById: string;
  triggerSource?: string;
  input?: unknown;
  canvas: CanvasState;
  requestId?: string;
  sessionId?: string;
  turnId?: string;
}

export interface CanvasExecutionHandle {
  workflowId: string;
  runId: string;
}

export async function startCanvasExecution(
  options: StartCanvasExecutionOptions
): Promise<CanvasExecutionHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "canvas",
    executionId: options.executionId,
  });

  const input: AgentCanvasExecutionInput = {
    executionId: options.executionId,
    agentCanvasId: options.agentCanvasId,
    versionNumber: options.versionNumber,
    teamId: options.teamId,
    triggeredById: options.triggeredById,
    triggerSource: options.triggerSource,
    input: options.input,
    canvas: options.canvas,
    sessionId: options.sessionId,
    turnId: options.turnId,
  };

  try {
    const handle = await client.workflow.start("agentCanvasExecutionWorkflow", {
      taskQueue: TASK_QUEUES.CANVAS,
      workflowId,
      args: [input],
      memo: {
        executionId: options.executionId,
        agentCanvasId: options.agentCanvasId,
      },
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return {
        workflowId,
        runId: "",
      };
    }

    throw error;
  }
}

export async function awaitCanvasExecutionCompletion(
  workflowId: string
): Promise<AgentCanvasExecutionOutput | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.result();
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }

    throw error;
  }
}

export async function pauseCanvasExecution(
  workflowId: string
): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(pauseSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }

    throw error;
  }
}

export async function resumeCanvasExecution(
  workflowId: string
): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(resumeSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }

    throw error;
  }
}

export async function cancelCanvasExecution(
  workflowId: string
): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(cancelSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }

    throw error;
  }
}

export async function submitCanvasApproval(params: {
  workflowId: string;
  payload: CanvasApprovalSignalPayload;
}): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(params.workflowId);
    await handle.signal(canvasApprovalSignal, params.payload);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }

    throw error;
  }
}

export async function submitCanvasInput(params: {
  workflowId: string;
  payload: CanvasInputSignalPayload;
}): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(params.workflowId);
    await handle.signal(canvasInputSignal, params.payload);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }

    throw error;
  }
}

export async function getCanvasExecutionState(
  workflowId: string
): Promise<CanvasExecutionQueryState | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(canvasExecutionQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }

    throw error;
  }
}
