import { getRedisClient } from "@openbeam/redis";
import type { BotPlatform, NotificationPriority } from "@openbeam/types/bot";

const WORK_PLATFORMS: BotPlatform[] = ["SLACK", "TEAMS", "DISCORD"];
const ASYNC_PLATFORMS: BotPlatform[] = ["WHATSAPP", "TELEGRAM"];

interface RoutingParams {
  teamId: string;
  userId: string;
  linkedPlatforms: BotPlatform[];
  priority: NotificationPriority;
  preferredPlatform: BotPlatform | null;
  timezone: string;
}

export async function resolveTargetPlatforms(
  params: RoutingParams
): Promise<BotPlatform[]> {
  const { linkedPlatforms, priority, preferredPlatform, timezone } = params;

  if (linkedPlatforms.length === 0) {
    return [];
  }

  if (priority === "CRITICAL") {
    return linkedPlatforms;
  }

  if (preferredPlatform && linkedPlatforms.includes(preferredPlatform)) {
    return [preferredPlatform];
  }

  const currentHour = getCurrentHour(timezone);
  const isWorkHours = currentHour >= 9 && currentHour < 18;

  if (isWorkHours) {
    const workPlatform = findFirst(linkedPlatforms, WORK_PLATFORMS);
    if (workPlatform) {
      return [workPlatform];
    }
  } else {
    const asyncPlatform = findFirst(linkedPlatforms, ASYNC_PLATFORMS);
    if (asyncPlatform) {
      return [asyncPlatform];
    }
  }

  const mostRecent = await getMostRecentPlatform(
    params.teamId,
    params.userId,
    linkedPlatforms
  );
  const fallback = mostRecent ?? linkedPlatforms[0];
  return fallback ? [fallback] : [];
}

function getCurrentHour(timezone: string): number {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return Number(hourStr);
}

function findFirst<T>(arr: T[], preferred: T[]): T | null {
  for (const p of preferred) {
    if (arr.includes(p)) {
      return p;
    }
  }
  return null;
}

async function getMostRecentPlatform(
  teamId: string,
  userId: string,
  platforms: BotPlatform[]
): Promise<BotPlatform | null> {
  const redis = await getRedisClient();
  let latestMs = 0;
  let latestPlatform: BotPlatform | null = null;

  for (const platform of platforms) {
    const ts = await redis.get(
      `notif:activity:${teamId}:${userId}:${platform}`
    );
    if (ts && Number(ts) > latestMs) {
      latestMs = Number(ts);
      latestPlatform = platform;
    }
  }

  return latestPlatform;
}

export async function recordPlatformActivity(
  teamId: string,
  userId: string,
  platform: BotPlatform
): Promise<void> {
  const redis = await getRedisClient();
  const noop = Function.prototype as () => void;
  await redis
    .set(`notif:activity:${teamId}:${userId}:${platform}`, String(Date.now()), {
      EX: 86_400,
    })
    .catch(noop);
}
