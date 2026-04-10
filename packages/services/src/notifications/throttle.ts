import { getRedisClient } from "@openbeam/redis";
import type {
  NotificationFrequency,
  NotificationPriority,
  ThrottleDecision,
} from "@openbeam/types/bot";
import { isInQuietHours } from "./quiet-hours";

const DAILY_CAP = 50;
const BATCH_WINDOW_SECONDS = 120;
const DEFAULT_DEDUP_SECONDS = 300;

interface ThrottleParams {
  teamId: string;
  userId: string;
  eventType: string;
  priority: NotificationPriority;
  dedupKey: string;
  dedupWindowSeconds?: number;
  frequency: NotificationFrequency;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string;
}

export async function evaluateThrottle(
  params: ThrottleParams
): Promise<ThrottleDecision> {
  const {
    teamId,
    userId,
    priority,
    dedupKey,
    frequency,
    quietHoursStart,
    quietHoursEnd,
    timezone,
  } = params;

  if (frequency === "OFF") {
    return { action: "suppress", reason: "user_opted_out" };
  }

  if (priority === "CRITICAL") {
    return { action: "deliver" };
  }

  const redis = await getRedisClient();

  const dedupRedisKey = `notif:dedup:${teamId}:${userId}:${dedupKey}`;
  const dedupTtl = params.dedupWindowSeconds ?? DEFAULT_DEDUP_SECONDS;
  const isDuplicate = await redis.set(dedupRedisKey, "1", {
    NX: true,
    EX: dedupTtl,
  });
  if (!isDuplicate) {
    return { action: "suppress", reason: "dedup_window" };
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const capKey = `notif:cap:daily:${teamId}:${userId}:${today}`;
  const count = await redis.incr(capKey);
  if (count === 1) {
    await redis.expireAt(capKey, endOfDayEpoch());
  }
  if (count > DAILY_CAP && priority !== "HIGH") {
    return { action: "queue_digest", reason: "daily_cap_overflow" };
  }

  if (isInQuietHours({ quietHoursStart, quietHoursEnd, timezone })) {
    return { action: "queue_digest", reason: "quiet_hours" };
  }

  if (frequency !== "IMMEDIATE") {
    return {
      action: "queue_digest",
      reason: `frequency_${frequency.toLowerCase()}`,
    };
  }

  if (priority === "NORMAL" || priority === "LOW") {
    const batchKey = `notif:batch:${teamId}:${userId}:${params.eventType}`;
    const isFirst = await redis.set(batchKey, "1", {
      NX: true,
      EX: BATCH_WINDOW_SECONDS,
    });
    if (!isFirst) {
      return { action: "queue_digest", reason: "batch_window" };
    }
  }

  return { action: "deliver" };
}

function endOfDayEpoch(): number {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return Math.floor(d.getTime() / 1000);
}
