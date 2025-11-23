// Redis client

// Cache
export { Cache, cache } from "./cache";
export {
  closeRedisClient,
  getRedisClient,
  getRedisConnection,
  redisClient,
} from "./client";
// Deduplication
export { EventDeduplicator, eventDeduplicator } from "./deduplication";
// Job scheduler keys (Redis-based storage)
export { jobSchedulerKeys } from "./job-scheduler-keys";
// Distributed locks
export { DistributedLock, distributedLock } from "./locks";
export { Fence, fence } from "./locks/fence";
// Queues
export * from "./queues";
export type { RateLimitConfig } from "./rate-limiter";
// Rate limiter
export { DEFAULT_RATE_LIMITS, RateLimiter, rateLimiter } from "./rate-limiter";
