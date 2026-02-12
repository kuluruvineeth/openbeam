import {
  type MissionAgentRunOutput,
  MissionOrchestratorInputSchema,
  type MissionOrchestratorOutput,
} from "@openplane/types/temporal/mission";
import {
  condition,
  continueAsNew,
  executeChild,
  patched,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { MissionActivities } from "../../activities/mission/types";
import {
  missionCommandSignal,
  missionRuntimeQuery,
  missionWakeSignal,
} from "../types";

const activities = proxyActivities<MissionActivities>({
  startToCloseTimeout: "2m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1s",
    backoffCoefficient: 2,
  },
});

type OrchestratorStatus =
  | "idle"
  | "dispatching"
  | "paused"
  | "cancelled"
  | "completed";

interface OrchestratorState {
  status: OrchestratorStatus;
  dispatchedRuns: number;
  completedTasks: number;
  consumedCents: number;
  lastDispatchAt: number | undefined;
  queueDepth: number;
  runningAgents: number;
  wakeQueue: Array<{ reason: string; metadata?: Record<string, unknown> }>;
}

export async function missionOrchestratorWorkflow(
  rawInput: unknown
): Promise<MissionOrchestratorOutput> {
  const input = MissionOrchestratorInputSchema.parse(rawInput);

  const state: OrchestratorState = {
    status: "idle",
    dispatchedRuns: input.checkpoint?.dispatchedRuns ?? 0,
    completedTasks: input.checkpoint?.completedTasks ?? 0,
    consumedCents: input.checkpoint?.consumedCents ?? 0,
    lastDispatchAt: input.checkpoint?.lastDispatchAt,
    queueDepth: 0,
    runningAgents: 0,
    wakeQueue: [],
  };

  setHandler(missionRuntimeQuery, () => ({
    status: state.status,
    queueDepth: state.queueDepth,
    runningAgents: state.runningAgents,
    lastDispatchAt: state.lastDispatchAt,
    budgetRemaining:
      input.budgetCents !== undefined
        ? Math.max(0, input.budgetCents - state.consumedCents)
        : undefined,
    dispatchedRuns: state.dispatchedRuns,
    completedTasks: state.completedTasks,
  }));

  setHandler(missionWakeSignal, (payload) => {
    state.wakeQueue.push({
      reason: payload.reason,
      metadata: payload.metadata,
    });
  });

  setHandler(missionCommandSignal, (payload) => {
    switch (payload.action) {
      case "pause":
        state.status = "paused";
        break;
      case "resume":
        state.status = "idle";
        break;
      case "cancel":
        state.status = "cancelled";
        break;
      default:
        break;
    }
  });

  await activities.logActivity({
    missionId: input.missionId,
    type: "orchestrator_started",
    message: `Mission orchestrator started with objective: ${input.objective.slice(0, 100)}`,
  });

  while (state.status !== "cancelled" && state.status !== "completed") {
    await condition(
      () =>
        state.wakeQueue.length > 0 ||
        state.status === "cancelled" ||
        state.status === "completed",
      input.heartbeatIntervalMin * 60 * 1000
    );

    if ((state.status as OrchestratorStatus) === "cancelled") {
      break;
    }
    if (state.status === "paused") {
      await condition(() => (state.status as OrchestratorStatus) !== "paused");
      if ((state.status as OrchestratorStatus) === "cancelled") {
        break;
      }
    }

    state.wakeQueue = [];

    if (
      input.budgetCents !== undefined &&
      state.consumedCents >= input.budgetCents
    ) {
      await activities.finalizeMission({
        missionId: input.missionId,
        status: "COMPLETED",
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "budget_exceeded",
        message: `Budget limit reached: ${state.consumedCents}/${input.budgetCents} cents`,
      });

      return {
        missionId: input.missionId,
        dispatchedRuns: state.dispatchedRuns,
        completedTasks: state.completedTasks,
        consumedCents: state.consumedCents,
        status: "budget_exceeded",
      };
    }

    state.status = "dispatching";

    const queue = await activities.refreshQueue({
      missionId: input.missionId,
    });
    state.queueDepth = queue.tasks.length;

    if (queue.tasks.length === 0) {
      const stats = await activities.getMissionStats({
        missionId: input.missionId,
      });
      state.runningAgents = stats.runs.running;

      if (stats.runs.running === 0) {
        state.status = "completed";
        break;
      }

      state.status = "idle";
      continue;
    }

    const plan = await activities.planDispatch({
      missionId: input.missionId,
      pendingTasks: queue.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        requiredCapabilities: t.requiredCapabilities,
      })),
      maxConcurrentRuns: input.maxConcurrentRuns,
    });

    const childPromises: Promise<MissionAgentRunOutput>[] = [];

    for (const dispatch of plan.dispatches) {
      const claimed = await activities.claimTask({
        taskId: dispatch.taskId,
        agentId: dispatch.agentId,
      });

      if (!claimed.claimed) {
        continue;
      }

      const { runId } = await activities.createRun({
        missionId: input.missionId,
        taskId: dispatch.taskId,
        agentId: dispatch.agentId,
      });

      const childWorkflowId = `mission-run:${input.missionId}:${runId}`;

      const childPromise = executeChild("missionAgentRunWorkflow", {
        workflowId: childWorkflowId,
        args: [
          {
            missionId: input.missionId,
            teamId: input.teamId,
            agentId: dispatch.agentId,
            agentName: dispatch.agentName,
            taskId: dispatch.taskId,
            runId,
            soulPrompt: dispatch.soulPrompt,
            tools: dispatch.tools,
            maxSteps: 20,
          },
        ],
      });
      childPromises.push(childPromise);

      await activities.updateRun({
        runId,
        status: "RUNNING",
        startedAt: workflowInfo().unsafe.now(),
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_dispatched",
        message: `Agent "${dispatch.agentName}" dispatched for task "${dispatch.taskTitle}"`,
        agentId: dispatch.agentId,
        metadata: {
          agentName: dispatch.agentName,
          taskId: dispatch.taskId,
          taskTitle: dispatch.taskTitle,
          runId,
        },
      });

      state.dispatchedRuns += 1;
      state.lastDispatchAt = workflowInfo().unsafe.now();
    }

    if (childPromises.length > 0) {
      const settled = await Promise.allSettled(childPromises);
      for (const result of settled) {
        if (result.status === "fulfilled") {
          const output = result.value;
          if (output.status === "completed") {
            state.completedTasks += 1;
          }
          state.consumedCents += output.costCents;
        }
      }
      if (patched("self-wake-after-dispatch")) {
        state.wakeQueue.push({ reason: "dispatch_cycle_complete" });
      }
    }

    state.status = "idle";

    if (workflowInfo().historyLength > 5000) {
      return continueAsNew<typeof missionOrchestratorWorkflow>({
        ...input,
        checkpoint: {
          dispatchedRuns: state.dispatchedRuns,
          completedTasks: state.completedTasks,
          consumedCents: state.consumedCents,
          lastDispatchAt: state.lastDispatchAt,
        },
      });
    }
  }

  const finalStatus = state.status === "cancelled" ? "cancelled" : "completed";
  const dbStatus = finalStatus === "cancelled" ? "CANCELLED" : "COMPLETED";

  await activities.finalizeMission({
    missionId: input.missionId,
    status: dbStatus,
  });

  await activities.logActivity({
    missionId: input.missionId,
    type: `orchestrator_${finalStatus}`,
    message: `Mission orchestrator ${finalStatus}. Dispatched: ${state.dispatchedRuns}, Completed: ${state.completedTasks}`,
  });

  return {
    missionId: input.missionId,
    dispatchedRuns: state.dispatchedRuns,
    completedTasks: state.completedTasks,
    consumedCents: state.consumedCents,
    status: finalStatus,
  };
}
