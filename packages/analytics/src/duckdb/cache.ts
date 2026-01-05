import { createHash } from "node:crypto";
import { CACHE_CONFIG, type CacheConfig } from "./config";
import { getMetricsCollector, type MetricsCollector } from "./metrics";
import type { QueryResult } from "./types";

const WILDCARD_SUFFIX_PATTERN = /\*$/;

export interface QueryCacheOptions {
  config?: Partial<CacheConfig>;
  metrics?: MetricsCollector;
  storage?: CacheStorage;
}

export interface CacheStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<number>;
}

export interface CachedQueryResult {
  result: QueryResult;
  cachedAt: number;
  ttl: number;
}

export interface QueryCacheInstance {
  get(
    documentId: string,
    sql: string,
    teamId: string
  ): Promise<QueryResult | null>;
  set(params: {
    documentId: string;
    sql: string;
    teamId: string;
    result: QueryResult;
    ttlSeconds?: number;
  }): Promise<void>;
  invalidate(documentId: string, teamId: string): Promise<void>;
  invalidateTeam(teamId: string): Promise<void>;
  generateKey(documentId: string, sql: string, teamId: string): string;
}

class InMemoryCacheStorage implements CacheStorage {
  private readonly cache = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return Promise.resolve(null);
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.value);
  }

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.cache.delete(key);
    return Promise.resolve();
  }

  deletePattern(pattern: string): Promise<number> {
    const prefix = pattern.replace(WILDCARD_SUFFIX_PATTERN, "");
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted += 1;
      }
    }
    return Promise.resolve(deleted);
  }
}

function hashSql(sql: string): string {
  return createHash("sha256").update(sql).digest("hex").slice(0, 16);
}

export function createQueryCache(
  options: QueryCacheOptions = {}
): QueryCacheInstance {
  const config: CacheConfig = {
    ...CACHE_CONFIG,
    ...options.config,
  };

  const metrics = options.metrics ?? getMetricsCollector();
  const storage = options.storage ?? new InMemoryCacheStorage();

  function generateKey(
    documentId: string,
    sql: string,
    teamId: string
  ): string {
    const sqlHash = hashSql(sql);
    return `${config.keyPrefix}${teamId}:${documentId}:${sqlHash}`;
  }

  async function get(
    documentId: string,
    sql: string,
    teamId: string
  ): Promise<QueryResult | null> {
    const key = generateKey(documentId, sql, teamId);

    try {
      const cached = await storage.get(key);
      if (!cached) {
        metrics.recordCacheMiss();
        return null;
      }

      const parsed: CachedQueryResult = JSON.parse(cached);

      const age = Date.now() - parsed.cachedAt;
      if (age > parsed.ttl * 1000) {
        await storage.delete(key);
        metrics.recordCacheMiss();
        return null;
      }

      metrics.recordCacheHit();
      return parsed.result;
    } catch {
      metrics.recordCacheMiss();
      return null;
    }
  }

  async function set(params: {
    documentId: string;
    sql: string;
    teamId: string;
    result: QueryResult;
    ttlSeconds?: number;
  }): Promise<void> {
    const { documentId, sql, teamId, result, ttlSeconds } = params;
    const ttl = Math.min(
      ttlSeconds ?? config.defaultTtlSeconds,
      config.maxTtlSeconds
    );

    const key = generateKey(documentId, sql, teamId);

    const cached: CachedQueryResult = {
      result,
      cachedAt: Date.now(),
      ttl,
    };

    await storage.set(key, JSON.stringify(cached), ttl);
  }

  async function invalidate(documentId: string, teamId: string): Promise<void> {
    const pattern = `${config.keyPrefix}${teamId}:${documentId}:*`;
    await storage.deletePattern(pattern);
  }

  async function invalidateTeam(teamId: string): Promise<void> {
    const pattern = `${config.keyPrefix}${teamId}:*`;
    await storage.deletePattern(pattern);
  }

  return {
    get,
    set,
    invalidate,
    invalidateTeam,
    generateKey,
  };
}

export type QueryCache = ReturnType<typeof createQueryCache>;

export function createRedisCacheStorage(redis: {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: string, ttl: number) => Promise<void>;
  del: (key: string) => Promise<void>;
  keys: (pattern: string) => Promise<string[]>;
}): CacheStorage {
  return {
    get(key: string): Promise<string | null> {
      return redis.get(key);
    },
    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
      await redis.set(key, value, "EX", ttlSeconds);
    },
    async delete(key: string): Promise<void> {
      await redis.del(key);
    },
    async deletePattern(pattern: string): Promise<number> {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      for (const key of keys) {
        await redis.del(key);
      }
      return keys.length;
    },
  };
}
