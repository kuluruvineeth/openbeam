import {
  type MissionEventPayload,
  MissionEventPayloadSchema,
} from "@openplane/types/mission-control";
import { LRUCache } from "lru-cache";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

const MISSION_EVENT_CHANNEL_PREFIX = "mission-events";
const PROGRESS_THROTTLE_MS = 250;
const THROTTLE_CACHE_MAX_ENTRIES = 10_000;
const THROTTLE_CACHE_TTL_MS = 5 * 60 * 1000;

const lastPublishTime = new LRUCache<string, number>({
  max: THROTTLE_CACHE_MAX_ENTRIES,
  ttl: THROTTLE_CACHE_TTL_MS,
});

const MAX_INDEX_ENTRIES = 10_000;

const missionIdIndex = new Map<string, Set<string>>();

function getMissionEventChannel(missionId: string, runId: string): string {
  return `${MISSION_EVENT_CHANNEL_PREFIX}:${missionId}:${runId}`;
}

const TERMINAL_EVENT_TYPES = [
  "mission.completed",
  "mission.failed",
  "mission.cancelled",
  "run.completed",
  "run.failed",
  "task.completed",
  "task.failed",
  "approval.resolved",
  "artifact.published",
];

function shouldThrottle(missionId: string, eventType: string): boolean {
  if (TERMINAL_EVENT_TYPES.includes(eventType)) {
    return false;
  }

  const now = Date.now();
  const key = `${missionId}:${eventType}`;
  const lastTime = lastPublishTime.get(key) ?? 0;

  if (now - lastTime < PROGRESS_THROTTLE_MS) {
    return true;
  }

  lastPublishTime.set(key, now);

  if (!missionIdIndex.has(missionId)) {
    if (missionIdIndex.size >= MAX_INDEX_ENTRIES) {
      const oldestKey = missionIdIndex.keys().next().value;
      if (oldestKey) {
        cleanupMissionThrottleCache(oldestKey);
      }
    }
    missionIdIndex.set(missionId, new Set());
  }
  missionIdIndex.get(missionId)?.add(key);

  return false;
}

export async function publishMissionEvent(
  missionId: string,
  runId: string,
  event: MissionEventPayload
): Promise<void> {
  if (shouldThrottle(missionId, event.eventType)) {
    return;
  }

  try {
    const client = await getRedisClient();
    const channel = getMissionEventChannel(missionId, runId);
    await client.publish(channel, JSON.stringify(event));
  } catch (error) {
    console.warn(
      `[mission-events] publish failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function createMissionEventSubscriber(
  missionId: string,
  runId: string,
  onEvent: (event: MissionEventPayload) => void,
  onError?: (error: Error) => void
): Promise<() => Promise<void>> {
  const client = await getRedisClient();
  const subscriber = client.duplicate() as RedisClientType;

  subscriber.on("error", (err: Error) => {
    onError?.(err);
  });

  await subscriber.connect();

  const channel = getMissionEventChannel(missionId, runId);

  await subscriber.subscribe(channel, (message) => {
    try {
      const parsed = JSON.parse(message);
      const event = MissionEventPayloadSchema.parse(parsed);
      onEvent(event);
    } catch (error) {
      console.warn(
        `[mission-events] parse failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    } catch (error) {
      console.warn(
        `[mission-events] cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };
}

export type MissionEventEmitterParams = {
  missionId: string;
  runId: string;
  lane: string;
};

export function createMissionEventEmitter(params: MissionEventEmitterParams) {
  const { missionId, runId, lane } = params;
  let sequence = 0;

  const emit = (eventType: string, payload: Record<string, unknown> = {}) => {
    const seq = sequence;
    sequence += 1;
    return publishMissionEvent(missionId, runId, {
      missionId,
      runId,
      lane: lane as "linear" | "autonomous" | "hybrid",
      sequence: seq,
      eventType,
      timestamp: Date.now(),
      payload,
    });
  };

  return {
    missionStarted: () => emit("mission.started"),
    missionCompleted: (summary: Record<string, unknown>) =>
      emit("mission.completed", summary),
    missionFailed: (error: string) => emit("mission.failed", { error }),
    missionPaused: () => emit("mission.paused"),
    missionResumed: () => emit("mission.resumed"),

    runStarted: (agentId: string, taskId?: string) =>
      emit("run.started", { agentId, taskId }),
    runCompleted: (agentId: string, result: Record<string, unknown>) =>
      emit("run.completed", { agentId, ...result }),
    runFailed: (agentId: string, error: string) =>
      emit("run.failed", { agentId, error }),

    taskClaimed: (taskId: string, agentId: string) =>
      emit("task.claimed", { taskId, agentId }),
    taskCompleted: (taskId: string, agentId: string) =>
      emit("task.completed", { taskId, agentId }),
    taskFailed: (taskId: string, agentId: string, error: string) =>
      emit("task.failed", { taskId, agentId, error }),

    toolCallStarted: (toolName: string, agentId: string) =>
      emit("tool.started", { toolName, agentId }),
    toolCallCompleted: (toolName: string, agentId: string, latencyMs: number) =>
      emit("tool.completed", { toolName, agentId, latencyMs }),

    approvalRequested: (
      approvalId: string,
      agentName: string,
      intent: string,
      riskLevel: string
    ) =>
      emit("approval.requested", { approvalId, agentName, intent, riskLevel }),
    approvalResolved: (
      approvalId: string,
      approved: boolean,
      resolvedById: string
    ) => emit("approval.resolved", { approvalId, approved, resolvedById }),

    artifactPublished: (
      artifactId: string,
      agentName: string,
      title: string,
      type: string
    ) => emit("artifact.published", { artifactId, agentName, title, type }),

    budgetUpdated: (consumedCents: number, budgetCents: number | undefined) =>
      emit("budget.updated", { consumedCents, budgetCents }),

    heartbeat: () => emit("heartbeat"),
  };
}

export function cleanupMissionThrottleCache(missionId: string): void {
  const keys = missionIdIndex.get(missionId);
  if (!keys) {
    return;
  }

  for (const key of keys) {
    lastPublishTime.delete(key);
  }

  missionIdIndex.delete(missionId);
}
