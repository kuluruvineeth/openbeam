import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowIdReusePolicy,
  WorkflowNotFoundError,
} from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type { ReaperStatus } from "../workflows/agents/control-reaper";
import { reaperStatusQuery } from "../workflows/agents/control-reaper";
import type { SchedulerStatus } from "../workflows/agents/control-scheduler";
import { schedulerStatusQuery } from "../workflows/agents/control-scheduler";
import type { TimerStatus } from "../workflows/agents/control-timer";
import {
  pauseTimerSignal,
  resumeTimerSignal,
  timerStatusQuery,
} from "../workflows/agents/control-timer";

export type { SchedulerStatus, ReaperStatus, TimerStatus };

export async function startControlScheduler(
  teamId: string,
  opts?: { tickIntervalMs?: number }
): Promise<{ workflowId: string; runId: string }> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "scheduler", teamId });

  try {
    const handle = await client.workflow.start("controlSchedulerWorkflow", {
      taskQueue: TASK_QUEUES.AGENTS,
      workflowId,
      args: [{ teamId, tickIntervalMs: opts?.tickIntervalMs }],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { workflowId, runId: "" };
    }
    throw error;
  }
}

export async function startControlReaper(
  teamId: string,
  opts?: { sweepIntervalMs?: number; staleThresholdMs?: number }
): Promise<{ workflowId: string; runId: string }> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "reaper", teamId });

  try {
    const handle = await client.workflow.start("controlReaperWorkflow", {
      taskQueue: TASK_QUEUES.AGENTS,
      workflowId,
      args: [
        {
          teamId,
          sweepIntervalMs: opts?.sweepIntervalMs,
          staleThresholdMs: opts?.staleThresholdMs,
        },
      ],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { workflowId, runId: "" };
    }
    throw error;
  }
}

export async function startControlTimer(
  teamId: string,
  agentId: string
): Promise<{ workflowId: string; runId: string }> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "timer", agentId });

  try {
    const handle = await client.workflow.start("controlTimerWorkflow", {
      taskQueue: TASK_QUEUES.AGENTS,
      workflowId,
      args: [{ teamId, agentId }],
      workflowIdReusePolicy:
        WorkflowIdReusePolicy.WORKFLOW_ID_REUSE_POLICY_REJECT_DUPLICATE,
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { workflowId, runId: "" };
    }
    throw error;
  }
}

export async function stopControlTimer(agentId: string): Promise<boolean> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "timer", agentId });

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.terminate();
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function pauseControlTimer(agentId: string): Promise<boolean> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "timer", agentId });

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(pauseTimerSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function resumeControlTimer(agentId: string): Promise<boolean> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "timer", agentId });

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(resumeTimerSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function getSchedulerStatus(
  teamId: string
): Promise<SchedulerStatus | null> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "scheduler", teamId });

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(schedulerStatusQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function getReaperStatus(
  teamId: string
): Promise<ReaperStatus | null> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "reaper", teamId });

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(reaperStatusQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function getTimerStatus(
  agentId: string
): Promise<TimerStatus | null> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({ type: "timer", agentId });

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(timerStatusQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}
