import { getRedisClient } from "@openbeam/redis";
import type { McpAuthContext } from "./auth";

const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
  redis.call('EXPIRE', key, window)
  return 1
end
return 0
`;

const WINDOW_MS = 60_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export async function checkMcpRateLimit(
  ctx: McpAuthContext
): Promise<RateLimitResult> {
  const redis = await getRedisClient();
  const key = `mcp:ratelimit:${ctx.teamId}:${ctx.userId}`;
  const now = Date.now();

  try {
    const result = await redis.eval(RATE_LIMIT_SCRIPT, {
      keys: [key],
      arguments: [
        String(ctx.rateLimitRequestsPerMinute),
        String(WINDOW_MS),
        String(now),
      ],
    });

    if (result === 1) {
      return { allowed: true };
    }

    const oldestScore = await redis.zRange(key, 0, 0, { REV: false });
    const retryAfterMs =
      oldestScore.length > 0
        ? WINDOW_MS -
          (now -
            Number.parseFloat((oldestScore[0] ?? "0").split(":")[0] ?? "0"))
        : WINDOW_MS;

    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  } catch {
    return { allowed: true };
  }
}
