import { randomUUID } from "node:crypto";
import type { RedisClientType } from "redis";
import { getRedisClient } from "./client";

/**
 * Distributed lock implementation using Redis
 * Prevents race conditions in distributed systems
 */
export class DistributedLock {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  /**
   * Acquire a distributed lock
   * @param key - Lock key
   * @param ttl - Lock expiration in seconds (default: 30)
   * @param retries - Number of retry attempts (default: 3)
   * @param retryDelay - Delay between retries in ms (default: 100)
   * @returns Lock token if acquired, null otherwise
   */
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
        // SET with NX (only if not exists) and EX (expiration)
        const result = await client.set(lockKey, token, {
          NX: true,
          EX: ttl,
        });

        if (result === "OK") {
          return token;
        }

        // Wait before retrying
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        console.error("Lock acquire error:", error);
      }
    }

    return null;
  }

  /**
   * Release a distributed lock
   * @param key - Lock key
   * @param token - Lock token returned from acquire()
   * @returns true if released successfully
   */
  async release(key: string, token: string): Promise<boolean> {
    const client = await this.getClient();
    const lockKey = `lock:${key}`;

    try {
      // Lua script to atomically check token and delete
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

  /**
   * Extend lock TTL
   * @param key - Lock key
   * @param token - Lock token
   * @param ttl - New TTL in seconds
   * @returns true if extended successfully
   */
  async extend(key: string, token: string, ttl: number): Promise<boolean> {
    const client = await this.getClient();
    const lockKey = `lock:${key}`;

    try {
      // Lua script to atomically check token and extend TTL
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

  /**
   * Check if a lock is held
   */
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

  /**
   * Execute a function with a lock
   * Automatically acquires and releases the lock
   */
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

// Export singleton instance
export const distributedLock = new DistributedLock();
