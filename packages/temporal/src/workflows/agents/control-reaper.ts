import type { Duration } from "@temporalio/common";
import {
  continueAsNew,
  defineQuery,
  proxyActivities,
  setHandler,
  sleep,
  workflowInfo,
} from "@temporalio/workflow";
import type { ControlPlaneActivities } from "../../activities/agents/control-types";
import { AGENT_LIFECYCLE_RETRY_POLICY } from "../../config/retry-policies";
import { AGENT_REAPER_TIMEOUTS } from "../../config/timeouts";
import { currentTimestamp } from "../temporal-utils";

function toDuration(value: string): Duration {
  return value as Duration;
}

export interface ReaperWorkflowInput {
  teamId: string;
  sweepIntervalMs?: number;
  staleThresholdMs?: number;
}

export interface ReaperStatus {
  lastRunAt: number;
  totalReaped: number;
  sweepCount: number;
}

export const reaperStatusQuery = defineQuery<ReaperStatus>("reaperStatus");

const activities = proxyActivities<
  Pick<ControlPlaneActivities, "reapOrphanedRuns">
>({
  startToCloseTimeout: toDuration(AGENT_REAPER_TIMEOUTS.startToCloseTimeout),
  heartbeatTimeout: toDuration(AGENT_REAPER_TIMEOUTS.heartbeatTimeout ?? "1m"),
  retry: AGENT_LIFECYCLE_RETRY_POLICY,
});

export async function controlReaperWorkflow(
  input: ReaperWorkflowInput
): Promise<void> {
  const sweepIntervalMs = input.sweepIntervalMs ?? 60_000;
  const staleThresholdMs = input.staleThresholdMs ?? 600_000;

  const status: ReaperStatus = {
    lastRunAt: 0,
    totalReaped: 0,
    sweepCount: 0,
  };

  setHandler(reaperStatusQuery, () => status);

  while (true) {
    const result = await activities.reapOrphanedRuns({
      teamId: input.teamId,
      staleThresholdMs,
    });

    status.lastRunAt = currentTimestamp();
    status.totalReaped += result.reaped;
    status.sweepCount += 1;

    if (workflowInfo().historyLength > 1000) {
      await continueAsNew<typeof controlReaperWorkflow>(input);
    }

    await sleep(sweepIntervalMs);
  }
}
