import {
  type MissionEventPayload,
  MissionEventPayloadSchema,
} from "@openplane/types/mission-control";
import { LRUCache } from "lru-cache";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";
import { redisLogger } from "../lib/logger";

const MISSION_EVENT_CHANNEL_PREFIX = "mission-events";
const MISSION_EVENT_SEQUENCE_KEY_PREFIX = "mission-events-sequence";
const MISSION_EVENT_SEQUENCE_TTL_SECONDS = 24 * 60 * 60;
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

function getMissionSequenceKey(missionId: string, runId: string): string {
  return `${MISSION_EVENT_SEQUENCE_KEY_PREFIX}:${missionId}:${runId}`;
}

async function nextMissionSequence(
  client: RedisClientType,
  missionId: string,
  runId: string
): Promise<number> {
  const key = getMissionSequenceKey(missionId, runId);
  const sequence = await client.incr(key);
  await client.expire(key, MISSION_EVENT_SEQUENCE_TTL_SECONDS);
  return sequence;
}

async function publishToChannel(
  client: RedisClientType,
  missionId: string,
  runId: string,
  event: MissionEventPayload
): Promise<void> {
  const channel = getMissionEventChannel(missionId, runId);
  await client.publish(channel, JSON.stringify(event));
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
    await publishToChannel(client, missionId, runId, event);
  } catch (error) {
    redisLogger.warn("mission event publish failed", {
      error: redisLogger.formatError(error),
    });
  }
}

export async function publishMissionTimelineEvent(input: {
  missionId: string;
  runId: string;
  lane: "linear" | "autonomous" | "hybrid";
  eventType: string;
  payload?: Record<string, unknown>;
  timestamp?: number;
}): Promise<void> {
  try {
    const client = await getRedisClient();
    const sequence = await nextMissionSequence(
      client,
      input.missionId,
      input.runId
    );

    await publishToChannel(client, input.missionId, input.runId, {
      missionId: input.missionId,
      runId: input.runId,
      lane: input.lane,
      sequence,
      eventType: input.eventType,
      timestamp: input.timestamp ?? Date.now(),
      payload: input.payload ?? {},
    });
  } catch (error) {
    redisLogger.warn("mission timeline publish failed", {
      error: redisLogger.formatError(error),
    });
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
      redisLogger.warn("mission event parse failed", {
        error: redisLogger.formatError(error),
      });
    }
  });

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    } catch (error) {
      redisLogger.warn("mission event subscriber cleanup failed", {
        error: redisLogger.formatError(error),
      });
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
