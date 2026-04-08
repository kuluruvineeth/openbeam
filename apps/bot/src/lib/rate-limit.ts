import type { BotPlatform } from "@openbeam/types/bot";

const USER_WINDOW_MS = 60_000;
const USER_MAX_REQUESTS = 30;
const TEAM_WINDOW_MS = 60_000;
const TEAM_MAX_REQUESTS = 500;
const CLEANUP_INTERVAL_MS = 60_000;

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
  cleanupTimer.unref();
}

function checkBucket(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function checkUserRateLimit(
  platform: BotPlatform,
  platformUserId: string
): boolean {
  return checkBucket(
    `user:${platform}:${platformUserId}`,
    USER_MAX_REQUESTS,
    USER_WINDOW_MS
  );
}

export function checkTeamRateLimit(teamId: string): boolean {
  return checkBucket(`team:${teamId}`, TEAM_MAX_REQUESTS, TEAM_WINDOW_MS);
}

export function resetBuckets(): void {
  buckets.clear();
}

export function stopCleanup(): void {
  clearInterval(cleanupTimer);
}
