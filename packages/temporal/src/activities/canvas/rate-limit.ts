import { rateLimiter } from "@openplane/redis";
import {
  type CheckRateLimitInput,
  CheckRateLimitInputSchema,
  type CheckRateLimitOutput,
} from "@openplane/types/temporal";

export interface RateLimitActivities {
  checkRateLimit(input: CheckRateLimitInput): Promise<CheckRateLimitOutput>;
}

export function createCheckRateLimitActivity() {
  return async function checkRateLimit(
    rawInput: unknown
  ): Promise<CheckRateLimitOutput> {
    const input = CheckRateLimitInputSchema.parse(rawInput);
    const { key, limit, windowMs } = input;

    const windowSeconds = Math.ceil(windowMs / 1000);
    const now = Date.now();
    const resetAt = now + windowMs;

    const allowed = await rateLimiter.checkLimit(key, limit, windowSeconds);
    const current = await rateLimiter.getUsage(key, windowSeconds);
    const remaining = Math.max(0, limit - current);

    return {
      allowed,
      remaining,
      resetAt,
      current,
    };
  };
}

export function createRateLimitActivities(): RateLimitActivities {
  return {
    checkRateLimit: createCheckRateLimitActivity(),
  };
}
