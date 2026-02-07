import {
  MissionAgentRunInputSchema,
  type MissionAgentRunOutput,
} from "@openplane/types/temporal/mission";
import { proxyActivities, setHandler } from "@temporalio/workflow";
import type { MissionActivities } from "../../activities/mission/types";
import { cancelSignal } from "../types";

const activities = proxyActivities<MissionActivities>({
  startToCloseTimeout: "5m",
  heartbeatTimeout: "1m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "2s",
    backoffCoefficient: 2,
  },
});

export async function missionAgentRunWorkflow(
  rawInput: unknown
): Promise<MissionAgentRunOutput> {
  const input = MissionAgentRunInputSchema.parse(rawInput);

  let isCancelled = false;
  setHandler(cancelSignal, () => {
    isCancelled = true;
  });

  const { context } = await activities.loadMissionContext({
    missionId: input.missionId,
    teamId: input.teamId,
    agentId: input.agentId,
    taskId: input.taskId,
  });

  let steps = 0;
  const tokensUsed = 0;
  const costCents = 0;
  const artifacts: unknown[] = [];
  let status: MissionAgentRunOutput["status"] = "completed";

  try {
    await activities.logActivity({
      missionId: input.missionId,
      type: "agent_run_started",
      message: `Agent started working on "${context.taskTitle}"`,
      agentId: input.agentId,
      metadata: { taskId: input.taskId, runId: input.runId },
    });

    while (steps < input.maxSteps && !isCancelled) {
      steps += 1;

      await activities.writeMemory({
        missionId: input.missionId,
        agentId: input.agentId,
        key: "current_step",
        value: { step: steps, taskId: input.taskId },
        scope: "agent",
      });

      const budgetCheck = await activities.updateBudget({
        missionId: input.missionId,
        costCents: 0,
      });

      if (budgetCheck.exceeded) {
        status = "budget_exceeded";
        break;
      }

      break;
    }

    if (isCancelled) {
      status = "cancelled";
    }

    await activities.postComment({
      taskId: input.taskId,
      fromAgentId: input.agentId,
      content:
        status === "completed"
          ? `Task completed in ${steps} step(s).`
          : `Run ended with status: ${status} after ${steps} step(s).`,
    });

    if (status === "completed") {
      await activities.completeTask({
        taskId: input.taskId,
        agentId: input.agentId,
      });
    }
  } catch (error) {
    status = "failed";

    await activities.logActivity({
      missionId: input.missionId,
      type: "agent_run_failed",
      message: `Agent run failed: ${error instanceof Error ? error.message : String(error)}`,
      agentId: input.agentId,
      metadata: { taskId: input.taskId, runId: input.runId },
    });
  }

  let runStatus: "COMPLETED" | "CANCELLED" | "FAILED";
  if (status === "completed") {
    runStatus = "COMPLETED";
  } else if (status === "cancelled") {
    runStatus = "CANCELLED";
  } else {
    runStatus = "FAILED";
  }

  await activities.updateRun({
    runId: input.runId,
    status: runStatus,
    completedAt: Date.now(),
    tokensUsed,
    costCents,
    ...(status === "failed" ? { error: "Agent run failed" } : {}),
  });

  await activities.logActivity({
    missionId: input.missionId,
    type: "agent_run_completed",
    message: `Agent run ${status}. Steps: ${steps}, Tokens: ${tokensUsed}`,
    agentId: input.agentId,
    metadata: {
      taskId: input.taskId,
      runId: input.runId,
      steps,
      tokensUsed,
      costCents,
      status,
    },
  });

  return {
    runId: input.runId,
    taskId: input.taskId,
    agentId: input.agentId,
    steps,
    tokensUsed,
    costCents,
    artifacts,
    status,
  };
}
