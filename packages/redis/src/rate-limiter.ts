import { randomUUID } from "node:crypto";
import { getRedisClient } from "./client";

export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
}

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
};

export const AGENT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  burstLimit: 15,
};

export class RateLimiter {
  async checkLimit(
    key: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const client = await getRedisClient();
    const now = Date.now();
    const windowStart = now - window * 1000;
    const redisKey = `ratelimit:${key}`;

    try {
      const multi = client.multi();

      multi.zRemRangeByScore(redisKey, 0, windowStart);

      multi.zCard(redisKey);

      const memberId = `${now}-${randomUUID()}`;
      multi.zAdd(redisKey, { score: now, value: memberId });

      multi.expire(redisKey, window);

      const results = await multi.exec();

      const currentCount =
        typeof results[1] === "number" ? results[1] : Number(results[1]);

      return currentCount < limit;
    } catch (error) {
      console.error("Rate limiter error:", error);
      return true;
    }
  }

  async getUsage(key: string, window: number): Promise<number> {
    const client = await getRedisClient();
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

  async reset(key: string): Promise<void> {
    const client = await getRedisClient();
    const redisKey = `ratelimit:${key}`;

    try {
      await client.del(redisKey);
    } catch (error) {
      console.error("Rate limiter reset error:", error);
    }
  }

  async checkConnectorRateLimit(
    connectorId: string,
    connectorType: string,
    customConfig?: RateLimitConfig
  ): Promise<{ allowed: boolean; reason?: string }> {
    const config = customConfig ||
      DEFAULT_RATE_LIMITS[connectorType] || {
        requestsPerMinute: 60,
        requestsPerHour: 3000,
        burstLimit: 20,
      };

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

      const baseDelay = 2 ** attempt * 1000;
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return false;
  }

  async checkAgentRateLimit(
    agentId: string,
    customConfig?: RateLimitConfig
  ): Promise<{ allowed: boolean; reason?: string }> {
    const config = customConfig ?? AGENT_RATE_LIMITS;

    if (config.burstLimit) {
      const burstAllowed = await this.checkLimit(
        `agent:${agentId}:burst`,
        config.burstLimit,
        10
      );

      if (!burstAllowed) {
        return { allowed: false, reason: "Agent burst limit exceeded" };
      }
    }

    if (config.requestsPerMinute) {
      const minuteAllowed = await this.checkLimit(
        `agent:${agentId}:minute`,
        config.requestsPerMinute,
        60
      );

      if (!minuteAllowed) {
        return { allowed: false, reason: "Agent per-minute limit exceeded" };
      }
    }

    if (config.requestsPerHour) {
      const hourAllowed = await this.checkLimit(
        `agent:${agentId}:hour`,
        config.requestsPerHour,
        3600
      );

      if (!hourAllowed) {
        return { allowed: false, reason: "Agent per-hour limit exceeded" };
      }
    }

    return { allowed: true };
  }

  async getAgentRemainingQuota(
    agentId: string,
    customConfig?: RateLimitConfig
  ): Promise<{
    burstRemaining?: number;
    minuteRemaining?: number;
    hourRemaining?: number;
  }> {
    const config = customConfig ?? AGENT_RATE_LIMITS;

    const result: {
      burstRemaining?: number;
      minuteRemaining?: number;
      hourRemaining?: number;
    } = {};

    if (config.burstLimit) {
      const burstUsage = await this.getUsage(`agent:${agentId}:burst`, 10);
      result.burstRemaining = Math.max(0, config.burstLimit - burstUsage);
    }

    if (config.requestsPerMinute) {
      const minuteUsage = await this.getUsage(`agent:${agentId}:minute`, 60);
      result.minuteRemaining = Math.max(
        0,
        config.requestsPerMinute - minuteUsage
      );
    }

    if (config.requestsPerHour) {
      const hourUsage = await this.getUsage(`agent:${agentId}:hour`, 3600);
      result.hourRemaining = Math.max(0, config.requestsPerHour - hourUsage);
    }

    return result;
  }

  async checkGlobalRateLimit(limit = 1000): Promise<boolean> {
    return await this.checkLimit("global", limit, 1);
  }
}

export const rateLimiter = new RateLimiter();
