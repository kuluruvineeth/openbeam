import type { Duration } from "@temporalio/common";
import {
  continueAsNew,
  defineQuery,
  executeChild,
  proxyActivities,
  setHandler,
  sleep,
  workflowInfo,
} from "@temporalio/workflow";
import type { ControlPlaneActivities } from "../../activities/agents/control-types";
import { AGENT_LIFECYCLE_RETRY_POLICY } from "../../config/retry-policies";
import { DATABASE_TIMEOUTS } from "../../config/timeouts";

function toDuration(value: string): Duration {
  return value as Duration;
}

import { generateWorkflowId } from "../../utils/workflow-id";
import { currentTimestamp } from "../temporal-utils";
import { controlHeartbeatWorkflow } from "./control-heartbeat";

export interface SchedulerWorkflowInput {
  teamId: string;
  tickIntervalMs?: number;
}

export interface SchedulerStatus {
  teamId: string;
  tickCount: number;
  lastTickAt: number;
  dispatchedCount: number;
}

export const schedulerStatusQuery =
  defineQuery<SchedulerStatus>("schedulerStatus");

const activities = proxyActivities<
  Pick<ControlPlaneActivities, "loadPendingWakeupRequests">
>({
  startToCloseTimeout: toDuration(DATABASE_TIMEOUTS.startToCloseTimeout),
  retry: AGENT_LIFECYCLE_RETRY_POLICY,
});

export async function controlSchedulerWorkflow(
  input: SchedulerWorkflowInput
): Promise<void> {
  const tickIntervalMs = input.tickIntervalMs ?? 10_000;

  const status: SchedulerStatus = {
    teamId: input.teamId,
    tickCount: 0,
    lastTickAt: currentTimestamp(),
    dispatchedCount: 0,
  };

  setHandler(schedulerStatusQuery, () => status);

  while (true) {
    const { requests } = await activities.loadPendingWakeupRequests({
      teamId: input.teamId,
    });

    for (const req of requests) {
      if (!req.adapterType) {
        continue;
      }

      const childWorkflowId = generateWorkflowId({
        type: "heartbeat",
        agentId: req.agentId,
        runId: req.id,
      });

      await executeChild(controlHeartbeatWorkflow, {
        workflowId: childWorkflowId,
        args: [
          {
            teamId: input.teamId,
            agentId: req.agentId,
            runId: req.id,
            wakeupRequestId: req.id,
            adapterType: req.adapterType,
            adapterConfig: req.adapterConfig,
            runtimeConfig: req.runtimeConfig,
            payload: req.payload,
            reason: req.reason,
            invocationSource: req.source,
          },
        ],
      });

      status.dispatchedCount += 1;
    }

    status.tickCount += 1;
    status.lastTickAt = currentTimestamp();

    if (workflowInfo().historyLength > 3000) {
      await continueAsNew<typeof controlSchedulerWorkflow>(input);
    }

    await sleep(tickIntervalMs);
  }
}
