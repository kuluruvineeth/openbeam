import type { RedisClientType } from "redis";
import { getRedisClient } from "./client";

export class Cache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    const cacheKey = `cache:${key}`;

    try {
      const value = await client.get(cacheKey);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error("Cache get error:", error);
      await client.del(cacheKey).catch((delError) => {
        console.error("Cache cleanup error:", delError);
      });
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    const client = await this.getClient();
    const cacheKey = `cache:${key}`;

    try {
      const serialized = JSON.stringify(value);
      await client.set(cacheKey, serialized, {
        EX: ttl,
      });
    } catch (error) {
      console.error("Cache set error:", error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    const cacheKey = `cache:${key}`;

    try {
      await client.del(cacheKey);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    const cacheKey = `cache:${key}`;

    try {
      const result = await client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const client = await this.getClient();
    const cacheKeys = keys.map((key) => `cache:${key}`);

    try {
      const values = await client.mGet(cacheKeys);
      return await Promise.all(
        values.map(async (value, index) => {
          if (!value) {
            return null;
          }
          try {
            return JSON.parse(value) as T;
          } catch (error) {
            const cacheKey = cacheKeys[index];
            console.error("Cache mget parse error:", { error, key: cacheKey });
            if (cacheKey) {
              await client.del(cacheKey).catch((delError) => {
                console.error("Cache cleanup error:", delError);
              });
            }
            return null;
          }
        })
      );
    } catch (error) {
      console.error("Cache mget error:", error);
      return keys.map(() => null);
    }
  }

  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    const client = await this.getClient();

    try {
      const multi = client.multi();

      for (const { key, value, ttl = 3600 } of entries) {
        const cacheKey = `cache:${key}`;
        const serialized = JSON.stringify(value);
        multi.set(cacheKey, serialized, { EX: ttl });
      }

      await multi.exec();
    } catch (error) {
      console.error("Cache mset error:", error);
      throw error;
    }
  }

  async clearPattern(pattern: string): Promise<number> {
    const client = await this.getClient();
    const searchPattern = `cache:${pattern}`;

    try {
      const keys: string[] = [];
      const iterator = client.scanIterator({
        MATCH: searchPattern,
        COUNT: 100,
      });

      for await (const key of iterator) {
        keys.push(String(key));
      }

      if (keys.length > 0) {
        let totalDeleted = 0;
        for (const key of keys) {
          await client.del(key);
          totalDeleted += 1;
        }
        return totalDeleted;
      }

      return 0;
    } catch (error) {
      console.error("Cache clear pattern error:", error);
      return 0;
    }
  }
}

export const cache = new Cache();
