import { randomUUID } from "node:crypto";
import type { RedisClientType } from "redis";
import { getRedisClient } from "./client";

export class DistributedLock {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async acquire(
    key: string,
    ttl = 30,
    retries = 3,
    retryDelay = 100
  ): Promise<string | null> {
    const client = await this.getClient();
    const lockKey = `lock:${key}`;
    const token = randomUUID();

    for (let i = 0; i < retries; i++) {
      try {
        const result = await client.set(lockKey, token, {
          NX: true,
          EX: ttl,
        });

        if (result === "OK") {
          return token;
        }

        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        console.error("Lock acquire error:", error);
      }
    }

    return null;
  }

  async release(key: string, token: string): Promise<boolean> {
    const client = await this.getClient();
    const lockKey = `lock:${key}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await client.eval(script, {
        keys: [lockKey],
        arguments: [token],
      });

      return result === 1;
    } catch (error) {
      console.error("Lock release error:", error);
      return false;
    }
  }

  async extend(key: string, token: string, ttl: number): Promise<boolean> {
    const client = await this.getClient();
    const lockKey = `lock:${key}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await client.eval(script, {
        keys: [lockKey],
        arguments: [token, ttl.toString()],
      });

      return result === 1;
    } catch (error) {
      console.error("Lock extend error:", error);
      return false;
    }
  }

  async isLocked(key: string): Promise<boolean> {
    const client = await this.getClient();
    const lockKey = `lock:${key}`;

    try {
      const result = await client.exists(lockKey);
      return result === 1;
    } catch (error) {
      console.error("Lock check error:", error);
      return false;
    }
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: {
      ttl?: number;
      retries?: number;
      retryDelay?: number;
      autoExtendIntervalMs?: number;
    } = {}
  ): Promise<T> {
    const ttl = options.ttl ?? 30;
    const token = await this.acquire(
      key,
      ttl,
      options.retries,
      options.retryDelay
    );

    if (!token) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    const autoExtendInterval =
      options.autoExtendIntervalMs ??
      Math.max(1000, Math.floor((ttl * 1000) / 2));

    const extendTimer: ReturnType<typeof setInterval> | null =
      ttl > 0
        ? setInterval(() => {
            this.extend(key, token, ttl).catch((error) => {
              console.error("Lock auto-extend error:", error);
            });
          }, autoExtendInterval)
        : null;

    if (extendTimer?.unref) {
      extendTimer.unref();
    }

    let releaseFailed = false;

    const result = await (async () => {
      try {
        return await fn();
      } finally {
        if (extendTimer) {
          clearInterval(extendTimer);
        }
        const released = await this.release(key, token);
        releaseFailed = !released;
      }
    })();

    if (releaseFailed) {
      return Promise.reject(new Error(`Failed to release lock: ${key}`));
    }

    return result;
  }
}

export const distributedLock = new DistributedLock();
