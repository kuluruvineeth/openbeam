import type { RuntimeEvent } from "@openplane/types/canvas/runtime-events";
import { RuntimeEventSchema } from "@openplane/types/canvas/runtime-events";
import { LRUCache } from "lru-cache";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";
import {
  recordParseFailure,
  recordPublish,
  recordSubscriberError,
  recordThrottled,
} from "../observability/runtime-stream-metrics";

const SESSION_EVENTS_CHANNEL_PREFIX = "session-runtime-events";
const EPHEMERAL_THROTTLE_MS = 100;
const THROTTLE_CACHE_MAX_ENTRIES = 10_000;
const THROTTLE_CACHE_TTL_MS = 5 * 60 * 1000;

const lastPublishTime = new LRUCache<string, number>({
  max: THROTTLE_CACHE_MAX_ENTRIES,
  ttl: THROTTLE_CACHE_TTL_MS,
});

const MAX_INDEX_ENTRIES = 10_000;

const sessionIdIndex = new Map<string, Set<string>>();

const NEVER_THROTTLE_TYPES = new Set([
  "chat.user_message",
  "chat.assistant_final",
  "tool.call_start",
  "tool.call_result",
  "canvas.op_applied",
  "canvas.op_rejected",
  "canvas.snapshot",
  "execution.started",
  "execution.completed",
  "execution.failed",
  "session.started",
  "session.resumed",
]);

function shouldThrottle(sessionId: string, eventType: string): boolean {
  if (NEVER_THROTTLE_TYPES.has(eventType)) {
    return false;
  }

  const now = Date.now();
  const key = `${sessionId}:${eventType}`;
  const lastTime = lastPublishTime.get(key) ?? 0;

  if (now - lastTime < EPHEMERAL_THROTTLE_MS) {
    recordThrottled();
    return true;
  }

  lastPublishTime.set(key, now);

  if (!sessionIdIndex.has(sessionId)) {
    if (sessionIdIndex.size >= MAX_INDEX_ENTRIES) {
      const oldestKey = sessionIdIndex.keys().next().value;
      if (oldestKey) {
        cleanupSessionThrottleCache(oldestKey);
      }
    }
    sessionIdIndex.set(sessionId, new Set());
  }
  sessionIdIndex.get(sessionId)?.add(key);

  return false;
}

export async function publishSessionRuntimeEvent(
  sessionId: string,
  event: RuntimeEvent
): Promise<void> {
  if (shouldThrottle(sessionId, event.payload.type)) {
    return;
  }

  const startTime = performance.now();
  try {
    const client = await getRedisClient();
    const channel = `${SESSION_EVENTS_CHANNEL_PREFIX}:${sessionId}`;
    await client.publish(channel, JSON.stringify(event));
    recordPublish(event.payload.type, performance.now() - startTime);
  } catch (error) {
    console.warn(
      `[session-events] publish failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function createSessionRuntimeEventSubscriber(
  sessionId: string,
  onEvent: (event: RuntimeEvent) => void,
  onError?: (error: Error) => void
): Promise<() => Promise<void>> {
  const client = await getRedisClient();
  const subscriber = client.duplicate() as RedisClientType;

  subscriber.on("error", (err: Error) => {
    recordSubscriberError();
    onError?.(err);
  });

  await subscriber.connect();

  const channel = `${SESSION_EVENTS_CHANNEL_PREFIX}:${sessionId}`;

  await subscriber.subscribe(channel, (message) => {
    try {
      const parsed = JSON.parse(message);
      const event = RuntimeEventSchema.parse(parsed);
      onEvent(event);
    } catch {
      recordParseFailure();
    }
  });

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    } catch (error) {
      console.warn(
        `[session-events] cleanup failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };
}

export function cleanupSessionThrottleCache(sessionId: string): void {
  const keys = sessionIdIndex.get(sessionId);
  if (!keys) {
    return;
  }

  for (const key of keys) {
    lastPublishTime.delete(key);
  }

  sessionIdIndex.delete(sessionId);
}
