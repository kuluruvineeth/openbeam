import type { Duration } from "@temporalio/common";
import {
  continueAsNew,
  getExternalWorkflowHandle,
  proxyActivities,
  setHandler,
  sleep,
  workflowInfo,
} from "@temporalio/workflow";
import type { ReflectionActivities } from "../../activities/mission/reflection-types";
import { cancelSignal, healthUpdateSignal } from "../types";

const HISTORY_THRESHOLD = 5000;
const DEFAULT_INTERVAL_MS = 30_000;

function toDuration(value: string): Duration {
  return value as Duration;
}

const reflectionActivities = proxyActivities<ReflectionActivities>({
  startToCloseTimeout: toDuration("3m"),
  heartbeatTimeout: toDuration("1m"),
  retry: {
    maximumAttempts: 2,
    initialInterval: "2s",
    backoffCoefficient: 2,
  },
});

export interface MissionHealthMonitorInput {
  missionId: string;
  parentWorkflowId: string;
  intervalMs?: number;
}

export async function missionHealthMonitorWorkflow(
  input: MissionHealthMonitorInput
): Promise<void> {
  const intervalMs = input.intervalMs ?? DEFAULT_INTERVAL_MS;
  let cancelled = false;

  setHandler(cancelSignal, () => {
    cancelled = true;
  });

  while (!cancelled) {
    await sleep(intervalMs);
    if (cancelled) {
      break;
    }

    try {
      const snapshot = await reflectionActivities.checkMissionHealth({
        missionId: input.missionId,
      });

      const parentHandle = getExternalWorkflowHandle(input.parentWorkflowId);
      await parentHandle.signal(healthUpdateSignal, snapshot);
    } catch {
      // skipped
    }

    if (workflowInfo().historyLength > HISTORY_THRESHOLD) {
      return continueAsNew<typeof missionHealthMonitorWorkflow>(input);
    }
  }
}
