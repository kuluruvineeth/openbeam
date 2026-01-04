import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";
import { DEFAULT_TOOL_TTLS, TOOL_CACHE_TTL, ToolCacheKeys } from "./tool-keys";

export interface CachedToolResult<T = unknown> {
  data: T;
  success: boolean;
  cachedAt: number;
  latencyMs: number;
  toolName: string;
  category: string;
}

export interface ToolCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  lastAccess: number;
}

export function hashToolParams(
  teamId: string,
  toolName: string,
  params: unknown
): string {
  const normalized = JSON.stringify(
    params,
    Object.keys(params as object).sort()
  );
  return createHash("sha256")
    .update(`${teamId}:${toolName}:${normalized}`)
    .digest("hex");
}

export class ToolCache {
  private client: RedisClientType | null = null;
  private readonly localCache = new Map<string, CachedToolResult>();
  private readonly localCacheMaxSize: number;
  private readonly localCacheTtlMs: number;

  constructor(localCacheMaxSize = 100, localCacheTtlMs = 10_000) {
    this.localCacheMaxSize = localCacheMaxSize;
    this.localCacheTtlMs = localCacheTtlMs;
  }

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  private getLocalCacheKey(
    teamId: string,
    toolName: string,
    hash: string
  ): string {
    return `${teamId}:${toolName}:${hash}`;
  }

  private getFromLocalCache(key: string): CachedToolResult | null {
    const cached = this.localCache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.cachedAt;
    if (age > this.localCacheTtlMs) {
      this.localCache.delete(key);
      return null;
    }

    return cached;
  }

  private setLocalCache(key: string, result: CachedToolResult): void {
    if (this.localCache.size >= this.localCacheMaxSize) {
      const firstKey = this.localCache.keys().next().value;
      if (firstKey) {
        this.localCache.delete(firstKey);
      }
    }
    this.localCache.set(key, result);
  }

  async get<T>(
    teamId: string,
    toolName: string,
    paramsHash: string
  ): Promise<CachedToolResult<T> | null> {
    const localKey = this.getLocalCacheKey(teamId, toolName, paramsHash);
    const localResult = this.getFromLocalCache(localKey);
    if (localResult) {
      await this.incrementStat(teamId, toolName, "hits");
      return localResult as CachedToolResult<T>;
    }

    try {
      const client = await this.getClient();
      const key = ToolCacheKeys.toolResult(teamId, toolName, paramsHash);
      const data = await client.get(key);

      if (!data) {
        await this.incrementStat(teamId, toolName, "misses");
        return null;
      }

      const result = JSON.parse(data) as CachedToolResult<T>;
      this.setLocalCache(localKey, result);
      await this.incrementStat(teamId, toolName, "hits");
      return result;
    } catch {
      return null;
    }
  }

  async set<T>(options: {
    teamId: string;
    toolName: string;
    paramsHash: string;
    result: CachedToolResult<T>;
    ttlSeconds?: number;
  }): Promise<void> {
    const { teamId, toolName, paramsHash, result, ttlSeconds } = options;
    const localKey = this.getLocalCacheKey(teamId, toolName, paramsHash);
    this.setLocalCache(localKey, result);

    try {
      const client = await this.getClient();
      const key = ToolCacheKeys.toolResult(teamId, toolName, paramsHash);
      const ttl =
        ttlSeconds ?? DEFAULT_TOOL_TTLS[result.category] ?? TOOL_CACHE_TTL;

      if (ttl > 0) {
        await client.set(key, JSON.stringify(result), { EX: ttl });
      }
    } catch {
      // Cache write failure should not break tool execution
    }
  }

  async invalidate(
    teamId: string,
    toolName: string,
    paramsHash: string
  ): Promise<void> {
    const localKey = this.getLocalCacheKey(teamId, toolName, paramsHash);
    this.localCache.delete(localKey);

    try {
      const client = await this.getClient();
      const key = ToolCacheKeys.toolResult(teamId, toolName, paramsHash);
      await client.del(key);
      await this.incrementStat(teamId, toolName, "evictions");
    } catch {
      // Cache invalidation failure should not break tool execution
    }
  }

  async invalidateByTool(teamId: string, toolName: string): Promise<void> {
    for (const key of this.localCache.keys()) {
      if (key.startsWith(`${teamId}:${toolName}:`)) {
        this.localCache.delete(key);
      }
    }

    try {
      const client = await this.getClient();
      const pattern = `tool:result:${teamId}:${toolName}:*`;
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch {
      // Cache invalidation failure should not break tool execution
    }
  }

  async invalidateByTeam(teamId: string): Promise<void> {
    for (const key of this.localCache.keys()) {
      if (key.startsWith(`${teamId}:`)) {
        this.localCache.delete(key);
      }
    }

    try {
      const client = await this.getClient();
      const pattern = `tool:result:${teamId}:*`;
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch {
      // Cache invalidation failure should not break tool execution
    }
  }

  private async incrementStat(
    teamId: string,
    toolName: string,
    stat: "hits" | "misses" | "evictions"
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const key = ToolCacheKeys.toolStats(teamId, toolName);
      await client.hIncrBy(key, stat, 1);
      await client.hSet(key, "lastAccess", Date.now().toString());
      await client.expire(key, 86_400);
    } catch {
      // Stats failure should not break tool execution
    }
  }

  async getStats(teamId: string, toolName: string): Promise<ToolCacheStats> {
    try {
      const client = await this.getClient();
      const key = ToolCacheKeys.toolStats(teamId, toolName);
      const data = await client.hGetAll(key);

      return {
        hits: Number.parseInt(data.hits ?? "0", 10),
        misses: Number.parseInt(data.misses ?? "0", 10),
        evictions: Number.parseInt(data.evictions ?? "0", 10),
        lastAccess: Number.parseInt(data.lastAccess ?? "0", 10),
      };
    } catch {
      return { hits: 0, misses: 0, evictions: 0, lastAccess: 0 };
    }
  }

  clearLocalCache(): void {
    this.localCache.clear();
  }
}

let instance: ToolCache | null = null;

export function getToolCache(): ToolCache {
  if (!instance) {
    instance = new ToolCache();
  }
  return instance;
}
