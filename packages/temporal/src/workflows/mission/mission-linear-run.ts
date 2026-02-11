import {
  MissionLinearRunInputSchema,
  type MissionLinearRunOutput,
} from "@openplane/types/temporal/mission";
import {
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { MissionActivities } from "../../activities/mission/types";
import { linearRunCancelSignal, linearRunProgressQuery } from "../types";

const activities = proxyActivities<MissionActivities>({
  startToCloseTimeout: "5m",
  heartbeatTimeout: "1m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "2s",
    backoffCoefficient: 2,
  },
});

export async function missionLinearRunWorkflow(
  rawInput: unknown
): Promise<MissionLinearRunOutput> {
  const input = MissionLinearRunInputSchema.parse(rawInput);

  let completedTasks = 0;
  let failedTasks = 0;
  let currentTaskIndex = 0;
  let cancelled = false;

  setHandler(linearRunCancelSignal, () => {
    cancelled = true;
  });

  setHandler(linearRunProgressQuery, () => ({
    completedTasks,
    currentTaskIndex,
    totalTasks: input.taskIds.length,
    status: cancelled ? ("cancelled" as const) : ("running" as const),
  }));

  for (const taskId of input.taskIds) {
    if (cancelled) {
      break;
    }

    currentTaskIndex += 1;

    try {
      const claimed = await activities.claimTask({
        taskId,
        agentId: input.agentId,
      });

      if (!claimed.claimed) {
        failedTasks += 1;
        continue;
      }

      await activities.loadMissionContext({
        missionId: input.missionId,
        teamId: input.teamId,
        agentId: input.agentId,
        taskId,
      });

      await activities.logActivity({
        missionId: input.missionId,
        agentId: input.agentId,
        type: "task_started",
        message: `Linear run started task: ${taskId}`,
        metadata: { taskId, runId: input.runId },
      });

      await activities.completeTask({
        taskId,
        agentId: input.agentId,
      });

      completedTasks += 1;
    } catch (error) {
      failedTasks += 1;

      await activities.logActivity({
        missionId: input.missionId,
        agentId: input.agentId,
        type: "task_failed",
        message: `Linear run task failed: ${taskId}`,
        metadata: {
          taskId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  const resolveStatus = (): "cancelled" | "failed" | "completed" => {
    if (cancelled) {
      return "cancelled";
    }
    if (failedTasks > 0) {
      return "failed";
    }
    return "completed";
  };
  const status = resolveStatus();

  const STATUS_MAP = {
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    failed: "FAILED",
  } as const;

  await activities.updateRun({
    runId: input.runId,
    status: STATUS_MAP[status],
    completedAt: workflowInfo().unsafe.now(),
  });

  await activities.logActivity({
    missionId: input.missionId,
    agentId: input.agentId,
    type: "linear_run_completed",
    message: `Linear run ${status}. Completed: ${completedTasks}, Failed: ${failedTasks}`,
    metadata: {
      runId: input.runId,
      completedTasks,
      failedTasks,
      status,
    },
  });

  return {
    runId: input.runId,
    completedTasks,
    failedTasks,
    status,
  };
}
