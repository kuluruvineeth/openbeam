import type { Context, Next } from "hono";
import type { SandboxAuthVariables } from "./auth";
import { isGlobalTeamScope } from "./auth";
import { getSandboxRedisClient, type SandboxRedisClient } from "./redis-client";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface RateLimitPolicy {
  keySuffix: string;
  limit: number;
  windowMs: number;
}

const EXEC_ROUTE_MARKER = "/exec/";
const SANDBOX_MUTATION_REGEX = /^\/sandboxes(\/[^/]+)?$/;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getWindowMs(): number {
  return parsePositiveInt(process.env.SANDBOX_RATE_LIMIT_WINDOW_MS, 60_000);
}

function getDefaultLimit(): number {
  return parsePositiveInt(process.env.SANDBOX_RATE_LIMIT_MAX_REQUESTS, 240);
}

function getExecLimit(): number {
  return parsePositiveInt(process.env.SANDBOX_RATE_LIMIT_MAX_EXEC_REQUESTS, 90);
}

function getMutationLimit(): number {
  return parsePositiveInt(
    process.env.SANDBOX_RATE_LIMIT_MAX_MUTATION_REQUESTS,
    120
  );
}

function isMutationRequest(method: string, path: string): boolean {
  if (method !== "POST" && method !== "DELETE" && method !== "PUT") {
    return false;
  }
  return SANDBOX_MUTATION_REGEX.test(path);
}

function resolvePolicy(method: string, path: string): RateLimitPolicy {
  const windowMs = getWindowMs();

  if (path.includes(EXEC_ROUTE_MARKER)) {
    return {
      keySuffix: "exec",
      limit: getExecLimit(),
      windowMs,
    };
  }

  if (isMutationRequest(method, path)) {
    return {
      keySuffix: "mutation",
      limit: getMutationLimit(),
      windowMs,
    };
  }

  return {
    keySuffix: "default",
    limit: getDefaultLimit(),
    windowMs,
  };
}

class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  take(
    key: string,
    policy: RateLimitPolicy,
    now = Date.now()
  ): RateLimitDecision {
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + policy.windowMs;
      this.buckets.set(key, {
        count: 1,
        resetAt,
      });
      return {
        allowed: true,
        limit: policy.limit,
        remaining: policy.limit - 1,
        resetAt,
      };
    }

    if (existing.count >= policy.limit) {
      return {
        allowed: false,
        limit: policy.limit,
        remaining: 0,
        resetAt: existing.resetAt,
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      limit: policy.limit,
      remaining: policy.limit - existing.count,
      resetAt: existing.resetAt,
    };
  }

  pruneExpired(now = Date.now()): void {
    for (const [key, value] of this.buckets.entries()) {
      if (value.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

const DEFAULT_RATE_LIMIT_KEY_PREFIX = "openplane:sandbox:ratelimit";
const REDIS_RATE_LIMIT_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

type AsyncRateLimiter = {
  take: (
    key: string,
    policy: RateLimitPolicy,
    now?: number
  ) => Promise<RateLimitDecision>;
  pruneExpired?: (now?: number) => void;
};

class RedisRateLimiter implements AsyncRateLimiter {
  private readonly redis: SandboxRedisClient;
  private readonly keyPrefix: string;

  constructor(redis: SandboxRedisClient) {
    this.redis = redis;
    const configuredPrefix = process.env.SANDBOX_RATE_LIMIT_KEY_PREFIX?.trim();
    this.keyPrefix =
      configuredPrefix && configuredPrefix.length > 0
        ? configuredPrefix
        : DEFAULT_RATE_LIMIT_KEY_PREFIX;
  }

  private namespacedKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private parseEvalResult(
    result: unknown,
    policy: RateLimitPolicy,
    now: number
  ): RateLimitDecision | null {
    if (!Array.isArray(result) || result.length < 2) {
      return null;
    }

    const countRaw = Number(result[0]);
    const ttlRaw = Number(result[1]);
    if (!Number.isFinite(countRaw)) {
      return null;
    }

    const count = Math.max(0, Math.trunc(countRaw));
    const ttlMs =
      Number.isFinite(ttlRaw) && ttlRaw > 0
        ? Math.trunc(ttlRaw)
        : policy.windowMs;
    const resetAt = now + ttlMs;
    const allowed = count <= policy.limit;

    return {
      allowed,
      limit: policy.limit,
      remaining: allowed ? Math.max(0, policy.limit - count) : 0,
      resetAt,
    };
  }

  async take(
    key: string,
    policy: RateLimitPolicy,
    now = Date.now()
  ): Promise<RateLimitDecision> {
    const result = await this.redis.eval(REDIS_RATE_LIMIT_LUA, {
      keys: [this.namespacedKey(key)],
      arguments: [String(policy.windowMs)],
    });
    const parsed = this.parseEvalResult(result, policy, now);
    if (parsed) {
      return parsed;
    }

    return {
      allowed: true,
      limit: policy.limit,
      remaining: policy.limit,
      resetAt: now + policy.windowMs,
    };
  }
}

const memoryRateLimiter = new InMemoryRateLimiter();
let resolvedRateLimiter: AsyncRateLimiter | null = null;
let resolvingRateLimiter: Promise<AsyncRateLimiter> | null = null;

function resolveRateLimitStoreKind(): "memory" | "redis" {
  if (process.env.SANDBOX_RATE_LIMIT_STORE?.toLowerCase() === "redis") {
    return "redis";
  }
  return "memory";
}

function resolveRateLimiter(): Promise<AsyncRateLimiter> {
  if (resolvedRateLimiter) {
    return Promise.resolve(resolvedRateLimiter);
  }
  if (resolvingRateLimiter) {
    return resolvingRateLimiter;
  }

  resolvingRateLimiter = (async () => {
    if (resolveRateLimitStoreKind() === "redis") {
      const redis = await getSandboxRedisClient();
      if (redis) {
        resolvedRateLimiter = new RedisRateLimiter(redis);
        return resolvedRateLimiter;
      }
    }

    resolvedRateLimiter = {
      take: (key, policy, now) =>
        Promise.resolve(memoryRateLimiter.take(key, policy, now)),
      pruneExpired: (now) => memoryRateLimiter.pruneExpired(now),
    };
    return resolvedRateLimiter;
  })().finally(() => {
    resolvingRateLimiter = null;
  });

  return resolvingRateLimiter;
}

function isRateLimitingEnabled(): boolean {
  return process.env.SANDBOX_RATE_LIMIT_ENABLED !== "false";
}

function appendRateLimitHeaders(
  c: Context,
  decision: RateLimitDecision,
  windowMs: number
): void {
  c.header("x-ratelimit-limit", String(decision.limit));
  c.header("x-ratelimit-remaining", String(Math.max(0, decision.remaining)));
  c.header("x-ratelimit-reset", String(Math.ceil(decision.resetAt / 1000)));
  c.header("x-ratelimit-window-ms", String(windowMs));
}

export async function sandboxRateLimit(
  c: Context<{ Variables: SandboxAuthVariables }>,
  next: Next
): Promise<Response | undefined> {
  if (!isRateLimitingEnabled()) {
    await next();
    return;
  }

  const teamId = c.get("teamId");
  if (isGlobalTeamScope(teamId)) {
    await next();
    return;
  }

  const limiter = await resolveRateLimiter();
  limiter.pruneExpired?.();

  const method = c.req.method;
  const path = c.req.path;
  const policy = resolvePolicy(method, path);
  const bucketKey = `${teamId}:${policy.keySuffix}`;
  let decision: RateLimitDecision;
  try {
    decision = await limiter.take(bucketKey, policy);
  } catch {
    decision = memoryRateLimiter.take(bucketKey, policy);
  }

  appendRateLimitHeaders(c, decision, policy.windowMs);

  if (!decision.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((decision.resetAt - Date.now()) / 1000)
    );
    c.header("retry-after", String(retryAfterSeconds));
    return c.json(
      {
        error: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds,
      },
      429
    );
  }

  await next();
  return;
}

export { InMemoryRateLimiter };
export type { RateLimitDecision, RateLimitPolicy };
