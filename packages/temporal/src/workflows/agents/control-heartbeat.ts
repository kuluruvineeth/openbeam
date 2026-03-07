import type { TimeoutTier } from "@openbeam/types/temporal/agent-timeouts";
import { TIMEOUT_TIERS } from "@openbeam/types/temporal/agent-timeouts";
import type { Duration } from "@temporalio/common";
import {
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import type { ControlPlaneActivities } from "../../activities/agents/control-types";
import {
  ADAPTER_EXECUTE_RETRY_POLICY,
  AGENT_LIFECYCLE_RETRY_POLICY,
} from "../../config/retry-policies";
import { DATABASE_TIMEOUTS } from "../../config/timeouts";

export interface HeartbeatWorkflowInput {
  teamId: string;
  agentId: string;
  runId: string;
  wakeupRequestId: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  payload?: Record<string, unknown>;
  reason?: string;
  invocationSource: string;
  timeoutTier?: TimeoutTier;
}

export interface HeartbeatWorkflowState {
  stage: "claiming" | "executing" | "completing" | "failed" | "done";
  agentId: string;
  runId: string;
  sessionId: string | undefined;
  cancelled: boolean;
}

export const cancelHeartbeatSignal = defineSignal("cancelHeartbeat");
export const heartbeatStateQuery =
  defineQuery<HeartbeatWorkflowState>("heartbeatState");

function toDuration(value: string): Duration {
  return value as Duration;
}

const lifecycleActivities = proxyActivities<
  Pick<
    ControlPlaneActivities,
    | "loadAgentForRun"
    | "claimAndStartRun"
    | "completeRun"
    | "failRun"
    | "updateRuntimeState"
  >
>({
  startToCloseTimeout: toDuration(DATABASE_TIMEOUTS.startToCloseTimeout),
  retry: AGENT_LIFECYCLE_RETRY_POLICY,
});

const notificationActivities = proxyActivities<
  Pick<ControlPlaneActivities, "publishRunEvent" | "logActivity">
>({
  startToCloseTimeout: "10s",
  retry: { maximumAttempts: 2 },
});

export async function controlHeartbeatWorkflow(
  input: HeartbeatWorkflowInput
): Promise<void> {
  const tier: TimeoutTier = input.timeoutTier ?? "standard";
  const tierConfig = TIMEOUT_TIERS[tier];

  const executeActivities = proxyActivities<
    Pick<ControlPlaneActivities, "executeAdapter">
  >({
    startToCloseTimeout: toDuration(tierConfig.startToCloseTimeout),
    scheduleToCloseTimeout: toDuration(tierConfig.scheduleToCloseTimeout),
    heartbeatTimeout: toDuration(tierConfig.heartbeatTimeout),
    retry: ADAPTER_EXECUTE_RETRY_POLICY,
  });

  const state: HeartbeatWorkflowState = {
    stage: "claiming",
    agentId: input.agentId,
    runId: input.runId,
    sessionId: undefined,
    cancelled: false,
  };

  setHandler(heartbeatStateQuery, () => state);
  setHandler(cancelHeartbeatSignal, () => {
    state.cancelled = true;
  });

  try {
    const claimResult = await lifecycleActivities.claimAndStartRun({
      teamId: input.teamId,
      agentId: input.agentId,
      runId: input.runId,
      wakeupRequestId: input.wakeupRequestId,
    });
    state.sessionId = claimResult.sessionIdBefore;

    await notificationActivities.publishRunEvent({
      teamId: input.teamId,
      agentId: input.agentId,
      runId: input.runId,
      type: "run_started",
    });

    if (state.cancelled) {
      state.stage = "failed";
      await lifecycleActivities.failRun({
        teamId: input.teamId,
        agentId: input.agentId,
        runId: input.runId,
        wakeupRequestId: input.wakeupRequestId,
        error: "Cancelled before execution",
        errorCode: "cancelled",
      });
      return;
    }

    state.stage = "executing";
    const execResult = await executeActivities.executeAdapter({
      teamId: input.teamId,
      agentId: input.agentId,
      runId: input.runId,
      adapterType: input.adapterType,
      adapterConfig: input.adapterConfig,
      runtimeConfig: input.runtimeConfig,
      agentName: input.agentId,
      sessionId: state.sessionId,
      sessionParams: null,
      payload: input.payload,
      reason: input.reason,
    });

    state.stage = "completing";
    await lifecycleActivities.completeRun({
      teamId: input.teamId,
      agentId: input.agentId,
      runId: input.runId,
      wakeupRequestId: input.wakeupRequestId,
      result: execResult.raw,
    });

    if (execResult.sessionId) {
      await lifecycleActivities.updateRuntimeState({
        teamId: input.teamId,
        agentId: input.agentId,
        adapterType: input.adapterType,
        sessionId: execResult.sessionId ?? undefined,
        lastRunId: input.runId,
        lastRunStatus: "COMPLETED",
      });
    }

    await notificationActivities.publishRunEvent({
      teamId: input.teamId,
      agentId: input.agentId,
      runId: input.runId,
      type: "run_completed",
      status: "COMPLETED",
    });

    state.stage = "done";
  } catch (error) {
    state.stage = "failed";
    const message = error instanceof Error ? error.message : "Unknown error";

    await lifecycleActivities.failRun({
      teamId: input.teamId,
      agentId: input.agentId,
      runId: input.runId,
      wakeupRequestId: input.wakeupRequestId,
      error: message,
      errorCode: "workflow_error",
    });

    await notificationActivities.publishRunEvent({
      teamId: input.teamId,
      agentId: input.agentId,
      runId: input.runId,
      type: "run_completed",
      status: "FAILED",
    });
  }
}
