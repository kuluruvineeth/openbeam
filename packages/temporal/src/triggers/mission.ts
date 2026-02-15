import type {
  LinearRunProgress,
  MissionCommandPayload,
  MissionOrchestratorInput,
  MissionOrchestratorOutput,
  MissionRuntimeQueryResult,
  MissionWakePayload,
} from "@openplane/types/temporal/mission";
import type {
  MissionHealthSnapshot,
  ReflectionEntry,
} from "@openplane/types/temporal/mission-reflection";
import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
} from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import {
  agentReflectionQuery,
  linearRunCancelSignal,
  linearRunProgressQuery,
  missionCommandSignal,
  missionHealthQuery,
  missionRuntimeQuery,
  missionWakeSignal,
} from "../workflows/types";

const DEFAULT_MAX_MISSIONS_PER_TEAM = 5;

export interface StartMissionOptions {
  missionId: string;
  teamId: string;
  objective: string;
  maxConcurrentRuns?: number;
  budgetCents?: number;
  heartbeatIntervalMin?: number;
  maxConcurrentMissionsPerTeam?: number;
}

export interface MissionHandle {
  workflowId: string;
  runId: string;
}

function getMissionWorkflowId(missionId: string): string {
  return `mission:${missionId}`;
}

export async function startMission(
  options: StartMissionOptions
): Promise<MissionHandle> {
  const maxConcurrent =
    options.maxConcurrentMissionsPerTeam ?? DEFAULT_MAX_MISSIONS_PER_TEAM;

  const activeMissions = await getActiveMissionsForTeam(options.teamId);
  if (activeMissions.length >= maxConcurrent) {
    throw new Error(
      `Team ${options.teamId} has ${activeMissions.length} active missions (limit: ${maxConcurrent})`
    );
  }

  const client = await getTemporalClient();
  const workflowId = getMissionWorkflowId(options.missionId);

  const input: MissionOrchestratorInput = {
    missionId: options.missionId,
    teamId: options.teamId,
    objective: options.objective,
    maxConcurrentRuns: options.maxConcurrentRuns ?? 3,
    budgetCents: options.budgetCents,
    heartbeatIntervalMin: options.heartbeatIntervalMin ?? 2,
  };

  try {
    const handle = await client.workflow.start("missionOrchestratorWorkflow", {
      taskQueue: TASK_QUEUES.MISSION,
      workflowId,
      args: [input],
      memo: {
        missionId: options.missionId,
        teamId: options.teamId,
      },
    });

    await handle.signal(missionWakeSignal, {
      missionId: options.missionId,
      reason: "initial",
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

export async function wakeMission(
  missionId: string,
  payload: MissionWakePayload
): Promise<boolean> {
  const client = await getTemporalClient();
  const workflowId = getMissionWorkflowId(missionId);

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(missionWakeSignal, payload);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function sendMissionCommand(
  missionId: string,
  command: MissionCommandPayload
): Promise<boolean> {
  const client = await getTemporalClient();
  const workflowId = getMissionWorkflowId(missionId);

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(missionCommandSignal, command);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export function pauseMission(
  missionId: string,
  actorId: string
): Promise<boolean> {
  return sendMissionCommand(missionId, { action: "pause", actorId });
}

export function resumeMission(
  missionId: string,
  actorId: string
): Promise<boolean> {
  return sendMissionCommand(missionId, { action: "resume", actorId });
}

export function cancelMission(
  missionId: string,
  actorId: string
): Promise<boolean> {
  return sendMissionCommand(missionId, { action: "cancel", actorId });
}

export async function getMissionRuntime(
  missionId: string
): Promise<MissionRuntimeQueryResult | null> {
  const client = await getTemporalClient();
  const workflowId = getMissionWorkflowId(missionId);

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(missionRuntimeQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function getMissionHealth(
  missionId: string
): Promise<MissionHealthSnapshot | null> {
  const client = await getTemporalClient();
  const workflowId = getMissionWorkflowId(missionId);

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(missionHealthQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function getAgentReflection(input: {
  missionId: string;
  runId: string;
}): Promise<{
  reflectionBuffer: ReflectionEntry[];
  replanCount: number;
} | null> {
  const client = await getTemporalClient();
  const workflowId = `mission-run:${input.missionId}:${input.runId}`;

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(agentReflectionQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function awaitMissionCompletion(
  missionId: string
): Promise<MissionOrchestratorOutput | null> {
  const client = await getTemporalClient();
  const workflowId = getMissionWorkflowId(missionId);

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

export async function createMissionHeartbeatSchedule(
  missionId: string,
  intervalMin: number,
  timezone?: string
): Promise<string> {
  const client = await getTemporalClient();
  const scheduleId = `mission-heartbeat-${missionId}`;

  const payload: MissionWakePayload = {
    missionId,
    reason: "heartbeat",
  };

  await client.schedule.create({
    scheduleId,
    spec: {
      intervals: [{ every: `${intervalMin}m` }],
      timezone: timezone ?? "UTC",
    },
    action: {
      type: "startWorkflow",
      workflowType: "missionHeartbeatWorkflow",
      taskQueue: TASK_QUEUES.MISSION,
      args: [payload],
    },
    memo: {
      missionId,
      scheduleType: "mission-heartbeat",
    },
  });

  return scheduleId;
}

export async function deleteMissionHeartbeatSchedule(
  missionId: string
): Promise<boolean> {
  const client = await getTemporalClient();
  const scheduleId = `mission-heartbeat-${missionId}`;

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.delete();
    return true;
  } catch {
    return false;
  }
}

export async function getActiveMissionsForTeam(
  teamId: string
): Promise<MissionHandle[]> {
  const client = await getTemporalClient();

  const workflows = client.workflow.list({
    query: `ExecutionStatus = "Running" AND WorkflowType = "missionOrchestratorWorkflow"`,
  });

  const handles: MissionHandle[] = [];
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

export async function startLinearRun(params: {
  missionId: string;
  teamId: string;
  runId: string;
  taskIds: string[];
  agentId: string;
}): Promise<MissionHandle> {
  const client = await getTemporalClient();
  const workflowId = `mission-linear-run:${params.missionId}:${params.runId}`;

  try {
    const handle = await client.workflow.start("missionLinearRunWorkflow", {
      taskQueue: TASK_QUEUES.MISSION,
      workflowId,
      args: [
        {
          missionId: params.missionId,
          teamId: params.teamId,
          runId: params.runId,
          taskIds: params.taskIds,
          agentId: params.agentId,
        },
      ],
      memo: {
        missionId: params.missionId,
        teamId: params.teamId,
        runId: params.runId,
      },
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

export async function getLinearRunProgress(
  missionId: string,
  runId: string
): Promise<LinearRunProgress | null> {
  const client = await getTemporalClient();
  const workflowId = `mission-linear-run:${missionId}:${runId}`;

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.query(linearRunProgressQuery);
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function cancelLinearRun(
  missionId: string,
  runId: string
): Promise<boolean> {
  const client = await getTemporalClient();
  const workflowId = `mission-linear-run:${missionId}:${runId}`;

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(linearRunCancelSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}
