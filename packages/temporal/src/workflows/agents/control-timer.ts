import type { Duration } from "@temporalio/common";
import {
  continueAsNew,
  defineQuery,
  defineSignal,
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

import { currentTimestamp } from "../temporal-utils";

export interface TimerWorkflowInput {
  teamId: string;
  agentId: string;
}

export interface TimerStatus {
  agentId: string;
  paused: boolean;
  fireCount: number;
  nextFireAt: number;
}

export const pauseTimerSignal = defineSignal("pauseTimer");
export const resumeTimerSignal = defineSignal("resumeTimer");
export const timerStatusQuery = defineQuery<TimerStatus>("timerStatus");

const activities = proxyActivities<
  Pick<ControlPlaneActivities, "loadAgentTimerConfig" | "enqueueTimerWakeup">
>({
  startToCloseTimeout: toDuration(DATABASE_TIMEOUTS.startToCloseTimeout),
  retry: AGENT_LIFECYCLE_RETRY_POLICY,
});

export async function controlTimerWorkflow(
  input: TimerWorkflowInput
): Promise<void> {
  const config = await activities.loadAgentTimerConfig({
    teamId: input.teamId,
    agentId: input.agentId,
  });

  if (!config.enabled || config.intervalSec <= 0) {
    return;
  }

  const status: TimerStatus = {
    agentId: input.agentId,
    paused: false,
    fireCount: 0,
    nextFireAt: currentTimestamp() + config.intervalSec * 1000,
  };

  setHandler(timerStatusQuery, () => status);
  setHandler(pauseTimerSignal, () => {
    status.paused = true;
  });
  setHandler(resumeTimerSignal, () => {
    status.paused = false;
    status.nextFireAt = currentTimestamp() + config.intervalSec * 1000;
  });

  while (true) {
    await sleep(config.intervalSec * 1000);

    if (!status.paused) {
      await activities.enqueueTimerWakeup({
        teamId: input.teamId,
        agentId: input.agentId,
      });
      status.fireCount += 1;
    }

    status.nextFireAt = currentTimestamp() + config.intervalSec * 1000;

    if (workflowInfo().historyLength > 2000) {
      await continueAsNew<typeof controlTimerWorkflow>(input);
    }
  }
}
