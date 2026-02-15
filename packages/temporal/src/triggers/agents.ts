import { WorkflowNotFoundError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import {
  type AgentChainProgress as AgentChainProgressState,
  agentChainProgressQuery,
  type ExtendTimeoutPayload,
  extendTimeoutSignal,
} from "../workflows/agents/signals";
import type {
  AgentArtifact,
  AgentState,
  BackgroundAgentInput,
  BackgroundAgentOutput,
} from "../workflows/types";
import {
  agentProgressQuery,
  artifactsQuery,
  cancelSignal,
  pauseSignal,
  resumeSignal,
} from "../workflows/types";

export type AgentPreset =
  | "researcher"
  | "coder"
  | "analyst"
  | "writer"
  | "custom";

export interface StartAgentOptions {
  agentType: string;
  teamId: string;
  userId: string;
  prompt: string;
  maxSteps?: number;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface AgentHandle {
  workflowId: string;
  runId: string;
}

export interface AgentProgress extends AgentState {
  workflowId: string;
}

export interface AgentChainProgress extends AgentChainProgressState {
  workflowId: string;
}

export async function startAgent(
  options: StartAgentOptions
): Promise<AgentHandle> {
  const client = await getTemporalClient();

  const sessionId = options.sessionId ?? crypto.randomUUID();

  const workflowId = generateWorkflowId({
    type: "agent",
    agentId: options.agentType,
    sessionId,
  });

  const input: BackgroundAgentInput = {
    sessionId,
    agentType: options.agentType,
    initialPrompt: options.prompt,
    context: {
      teamId: options.teamId,
      userId: options.userId,
      ...options.context,
    },
    maxSteps: options.maxSteps ?? 100,
  };

  const handle = await client.workflow.start("backgroundAgentWorkflow", {
    taskQueue: TASK_QUEUES.AGENTS,
    workflowId,
    args: [input],
    memo: {
      agentType: options.agentType,
    },
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

export async function getAgentProgress(
  workflowId: string
): Promise<AgentProgress | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const state = await handle.query(agentProgressQuery);

    return {
      ...state,
      workflowId,
    };
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function getAgentArtifacts(
  workflowId: string
): Promise<AgentArtifact[]> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(artifactsQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return [];
    }
    throw error;
  }
}

export async function pauseAgent(workflowId: string): Promise<boolean> {
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

export async function resumeAgent(workflowId: string): Promise<boolean> {
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

export async function cancelAgent(workflowId: string): Promise<boolean> {
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

export async function extendAgentTimeout(
  workflowId: string,
  payload: ExtendTimeoutPayload
): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(extendTimeoutSignal, payload);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function getAgentChainProgress(
  workflowId: string
): Promise<AgentChainProgress | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const progress = await handle.query(agentChainProgressQuery);
    return {
      workflowId,
      ...progress,
    };
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function awaitAgentCompletion(
  workflowId: string
): Promise<BackgroundAgentOutput | null> {
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

export async function getActiveAgentsForUser(
  userId: string
): Promise<AgentHandle[]> {
  const client = await getTemporalClient();

  const workflows = client.workflow.list({
    query: `ExecutionStatus = "Running" AND WorkflowType = "backgroundAgentWorkflow"`,
  });

  const handles: AgentHandle[] = [];
  for await (const workflow of workflows) {
    const memo = workflow.memo as Record<string, unknown> | undefined;
    if (memo?.userId === userId) {
      handles.push({
        workflowId: workflow.workflowId,
        runId: workflow.runId,
      });
    }
  }

  return handles;
}

export async function getActiveAgentsForTeam(
  teamId: string
): Promise<AgentHandle[]> {
  const client = await getTemporalClient();

  const workflows = client.workflow.list({
    query: `ExecutionStatus = "Running" AND WorkflowType = "backgroundAgentWorkflow"`,
  });

  const handles: AgentHandle[] = [];
  for await (const workflow of workflows) {
    const memo = workflow.memo as Record<string, unknown> | undefined;
    if (memo?.teamId === teamId) {
      handles.push({
        workflowId: workflow.workflowId,
        runId: workflow.runId,
      });
    }
  }

  return handles;
}
