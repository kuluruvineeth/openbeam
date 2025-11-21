import { randomUUID } from "node:crypto";
import type { RedisClientType } from "redis";
import { getRedisClient } from "./client";

/**
 * Distributed rate limiter using Redis
 * Implements sliding window algorithm for accurate rate limiting
 */
export class RateLimiter {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  /**
   * Check if a request is allowed based on rate limit
   * @param key - Unique identifier for the rate limit (e.g., "slack:api:workspace_id")
   * @param limit - Maximum number of requests allowed
   * @param window - Time window in seconds
   * @returns true if request is allowed, false if rate limit exceeded
   */
  async checkLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const client = await this.getClient();
    const now = Date.now();
    const windowStart = now - window * 1000;
    const redisKey = `ratelimit:${key}`;

    try {
      // Use Redis transaction for atomic operations
      const multi = client.multi();

      // Remove old entries outside the window
      multi.zRemRangeByScore(redisKey, 0, windowStart);

      // Count current entries in the window
      multi.zCard(redisKey);

      // Add current request with a unique identifier to avoid collisions
      const memberId = `${now}-${randomUUID()}`;
      multi.zAdd(redisKey, { score: now, value: memberId });

      // Set expiry on the key
      multi.expire(redisKey, window);

      const results = await multi.exec();

      // results[1] is the count from zCard
      const currentCount =
        typeof results[1] === "number" ? results[1] : Number(results[1]);

      // Check if we're under the limit
      return currentCount < limit;
    } catch (error) {
      console.error("Rate limiter error:", error);
      // Fail open - allow request if Redis is down
      return true;
    }
  }

  /**
   * Get current usage for a rate limit key
   */
  async getUsage(key: string, window: number): Promise<number> {
    const client = await this.getClient();
    const now = Date.now();
    const windowStart = now - window * 1000;
    const redisKey = `ratelimit:${key}`;

    try {
      return await client.zCount(redisKey, windowStart, now);
    } catch (error) {
      console.error("Rate limiter get usage error:", error);
      return 0;
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    const client = await this.getClient();
    const redisKey = `ratelimit:${key}`;

    try {
      await client.del(redisKey);
    } catch (error) {
      console.error("Rate limiter reset error:", error);
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
