import { randomUUID } from "node:crypto";
import type { RedisClientType } from "redis";
import { getRedisClient } from "./client";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
}

/**
 * Default rate limits per connector type
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  slack: {
    requestsPerMinute: 50,
    requestsPerHour: 2000,
    burstLimit: 20,
  },
  notion: {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    burstLimit: 10,
  },
  drive: {
    requestsPerMinute: 100,
    requestsPerHour: 5000,
    burstLimit: 30,
  },
  github: {
    requestsPerMinute: 60,
    requestsPerHour: 5000,
    burstLimit: 20,
  },
  // Add more connector types as needed
};

/**
 * Distributed rate limiter using Redis
 * Implements three-level rate limiting:
 * 1. Global - Prevent Redis overload
 * 2. Per-Connector - Respect API limits
 * 3. Per-Connector-Type - Default limits
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

  /**
   * Check connector-specific rate limits (three-level)
   *
   * @param connectorId - Unique connector identifier
   * @param connectorType - Type of connector (slack, notion, etc.)
   * @param customConfig - Optional custom rate limit config
   * @returns true if request is allowed, false if rate limit exceeded
   */
  async checkConnectorRateLimit(
    connectorId: string,
    connectorType: string,
    customConfig?: RateLimitConfig
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get rate limit config (custom > default > fallback)
    const config = customConfig ||
      DEFAULT_RATE_LIMITS[connectorType] || {
        requestsPerMinute: 60,
        requestsPerHour: 3000,
        burstLimit: 20,
      };

    // Check burst limit (short window - 10 seconds)
    if (config.burstLimit) {
      const burstAllowed = await this.checkLimit(
        `connector:${connectorId}:burst`,
        config.burstLimit,
        10
      );

      if (!burstAllowed) {
        return { allowed: false, reason: "Burst limit exceeded" };
      }
    }

    // Check per-minute limit
    if (config.requestsPerMinute) {
      const minuteAllowed = await this.checkLimit(
        `connector:${connectorId}:minute`,
        config.requestsPerMinute,
        60
      );

      if (!minuteAllowed) {
        return { allowed: false, reason: "Per-minute limit exceeded" };
      }
    }

    // Check per-hour limit
    if (config.requestsPerHour) {
      const hourAllowed = await this.checkLimit(
        `connector:${connectorId}:hour`,
        config.requestsPerHour,
        3600
      );

      if (!hourAllowed) {
        return { allowed: false, reason: "Per-hour limit exceeded" };
      }
    }

    return { allowed: true };
  }

  /**
   * Get remaining quota for a connector
   *
   * @param connectorId - Unique connector identifier
   * @param connectorType - Type of connector
   * @param customConfig - Optional custom rate limit config
   * @returns Remaining quota for each time window
   */
  async getRemainingQuota(
    connectorId: string,
    connectorType: string,
    customConfig?: RateLimitConfig
  ): Promise<{
    burstRemaining?: number;
    minuteRemaining?: number;
    hourRemaining?: number;
  }> {
    const config = customConfig ||
      DEFAULT_RATE_LIMITS[connectorType] || {
        requestsPerMinute: 60,
        requestsPerHour: 3000,
        burstLimit: 20,
      };

    const result: {
      burstRemaining?: number;
      minuteRemaining?: number;
      hourRemaining?: number;
    } = {};

    if (config.burstLimit) {
      const burstUsage = await this.getUsage(
        `connector:${connectorId}:burst`,
        10
      );
      result.burstRemaining = Math.max(0, config.burstLimit - burstUsage);
    }

    if (config.requestsPerMinute) {
      const minuteUsage = await this.getUsage(
        `connector:${connectorId}:minute`,
        60
      );
      result.minuteRemaining = Math.max(
        0,
        config.requestsPerMinute - minuteUsage
      );
    }

    if (config.requestsPerHour) {
      const hourUsage = await this.getUsage(
        `connector:${connectorId}:hour`,
        3600
      );
      result.hourRemaining = Math.max(0, config.requestsPerHour - hourUsage);
    }

    return result;
  }

  /**
   * Wait for quota to become available
   * Implements exponential backoff with jitter
   *
   * @param connectorId - Unique connector identifier
   * @param connectorType - Type of connector
   * @param customConfig - Optional custom rate limit config
   * @param maxRetries - Maximum number of retries (default: 5)
   * @returns true if quota became available, false if max retries exceeded
   */
  async waitForQuota(
    connectorId: string,
    connectorType: string,
    customConfig?: RateLimitConfig,
    maxRetries = 5
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { allowed } = await this.checkConnectorRateLimit(
        connectorId,
        connectorType,
        customConfig
      );

      if (allowed) {
        return true;
      }

      // Exponential backoff with jitter: 2^attempt * 1000ms + random(0-1000ms)
      const baseDelay = 2 ** attempt * 1000;
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return false;
  }

  /**
   * Check global rate limit (prevents Redis overload)
   *
   * @param limit - Global request limit (default: 1000 req/sec)
   * @returns true if request is allowed
   */
  async checkGlobalRateLimit(limit = 1000): Promise<boolean> {
    return await this.checkLimit("global", limit, 1);
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
