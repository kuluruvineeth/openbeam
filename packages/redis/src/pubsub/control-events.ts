import { LRUCache } from "lru-cache";
import type { RedisClientType } from "redis";
import { z } from "zod";
import { getRedisClient } from "../client";

const CONTROL_EVENTS_CHANNEL_PREFIX = "control-events";
const THROTTLE_MS = 250;
const THROTTLE_CACHE_MAX_ENTRIES = 10_000;
const THROTTLE_CACHE_TTL_MS = 5 * 60 * 1000;

const lastPublishTime = new LRUCache<string, number>({
  max: THROTTLE_CACHE_MAX_ENTRIES,
  ttl: THROTTLE_CACHE_TTL_MS,
});

const teamIdIndex = new Map<string, Set<string>>();

const BaseEventSchema = z.object({
  teamId: z.string(),
  timestamp: z.number(),
});

const AgentStatusChangedSchema = BaseEventSchema.extend({
  type: z.literal("agent.status_changed"),
  payload: z.object({
    agentId: z.string(),
    status: z.string(),
  }),
});

const RunStartedSchema = BaseEventSchema.extend({
  type: z.literal("heartbeat.run_started"),
  payload: z.object({
    agentId: z.string(),
    runId: z.string(),
  }),
});

const RunCompletedSchema = BaseEventSchema.extend({
  type: z.literal("heartbeat.run_completed"),
  payload: z.object({
    agentId: z.string(),
    runId: z.string(),
    status: z.string(),
  }),
});

const RunOutputSchema = BaseEventSchema.extend({
  type: z.literal("heartbeat.run_output"),
  payload: z.object({
    runId: z.string(),
    stream: z.string(),
    chunk: z.string(),
  }),
});

const ActivityCreatedSchema = BaseEventSchema.extend({
  type: z.literal("activity.created"),
  payload: z.object({
    entityType: z.string(),
    entityId: z.string(),
    action: z.string(),
  }),
});

const ApprovalStatusChangedSchema = BaseEventSchema.extend({
  type: z.literal("approval.status_changed"),
  payload: z.object({
    approvalId: z.string(),
    status: z.string(),
    agentId: z.string(),
  }),
});

export const ControlEventSchema = z.discriminatedUnion("type", [
  AgentStatusChangedSchema,
  RunStartedSchema,
  RunCompletedSchema,
  RunOutputSchema,
  ActivityCreatedSchema,
  ApprovalStatusChangedSchema,
]);

export type ControlEvent = z.infer<typeof ControlEventSchema>;

const TERMINAL_EVENTS: ReadonlySet<string> = new Set([
  "heartbeat.run_completed",
  "agent.status_changed",
  "approval.status_changed",
]);

function shouldThrottle(teamId: string, eventType: string): boolean {
  if (TERMINAL_EVENTS.has(eventType)) {
    return false;
  }

  const now = Date.now();
  const key = `${teamId}:${eventType}`;
  const lastTime = lastPublishTime.get(key) ?? 0;

  if (now - lastTime < THROTTLE_MS) {
    return true;
  }

  lastPublishTime.set(key, now);

  if (!teamIdIndex.has(teamId)) {
    teamIdIndex.set(teamId, new Set());
  }
  teamIdIndex.get(teamId)?.add(key);

  return false;
}

export async function publishControlEvent(
  teamId: string,
  event: ControlEvent
): Promise<void> {
  if (shouldThrottle(teamId, event.type)) {
    return;
  }

  try {
    const client = await getRedisClient();
    const channel = `${CONTROL_EVENTS_CHANNEL_PREFIX}:${teamId}`;
    await client.publish(channel, JSON.stringify(event));
    // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort pub/sub
  } catch {}
}

export async function createControlEventSubscriber(
  teamId: string,
  onEvent: (event: ControlEvent) => void,
  onError?: (error: Error) => void
): Promise<() => Promise<void>> {
  const client = await getRedisClient();
  const subscriber = client.duplicate() as RedisClientType;

  subscriber.on("error", (err: Error) => {
    onError?.(err);
  });

  await subscriber.connect();

  const channel = `${CONTROL_EVENTS_CHANNEL_PREFIX}:${teamId}`;

  await subscriber.subscribe(channel, (message) => {
    try {
      const parsed = JSON.parse(message);
      const event = ControlEventSchema.parse(parsed);
      onEvent(event);
      // biome-ignore lint/suspicious/noEmptyBlockStatements: skip malformed events
    } catch {}
  });

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort cleanup
    } catch {}
  };
}

export function cleanupControlThrottleCache(teamId: string): void {
  const keys = teamIdIndex.get(teamId);
  if (!keys) {
    return;
  }

  for (const key of keys) {
    lastPublishTime.delete(key);
  }

  teamIdIndex.delete(teamId);
}

export function createControlEventEmitter(teamId: string) {
  return {
    agentStatusChanged: (agentId: string, status: string) =>
      publishControlEvent(teamId, {
        type: "agent.status_changed",
        teamId,
        timestamp: Date.now(),
        payload: { agentId, status },
      }),

    runStarted: (agentId: string, runId: string) =>
      publishControlEvent(teamId, {
        type: "heartbeat.run_started",
        teamId,
        timestamp: Date.now(),
        payload: { agentId, runId },
      }),

    runCompleted: (agentId: string, runId: string, status: string) =>
      publishControlEvent(teamId, {
        type: "heartbeat.run_completed",
        teamId,
        timestamp: Date.now(),
        payload: { agentId, runId, status },
      }),

    runOutput: (runId: string, stream: string, chunk: string) =>
      publishControlEvent(teamId, {
        type: "heartbeat.run_output",
        teamId,
        timestamp: Date.now(),
        payload: { runId, stream, chunk },
      }),

    activityCreated: (entityType: string, entityId: string, action: string) =>
      publishControlEvent(teamId, {
        type: "activity.created",
        teamId,
        timestamp: Date.now(),
        payload: { entityType, entityId, action },
      }),

    approvalStatusChanged: (
      approvalId: string,
      status: string,
      agentId: string
    ) =>
      publishControlEvent(teamId, {
        type: "approval.status_changed",
        teamId,
        timestamp: Date.now(),
        payload: { approvalId, status, agentId },
      }),
  };
}
