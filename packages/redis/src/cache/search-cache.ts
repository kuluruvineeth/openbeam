import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { z } from "zod";
import { getRedisClient } from "../client";
import { SEARCH_CACHE_TTL_SECONDS, SearchCacheKeys } from "./search-cache-keys";

const CachedSearchResultSchema = z.object({
  documentIds: z.array(z.string()),
  scores: z.record(z.string(), z.number()),
  totalCount: z.number(),
  cachedAt: z.number(),
});

export type CachedSearchResult = z.infer<typeof CachedSearchResultSchema>;

function createSearchKey(
  teamId: string,
  query: string,
  filters?: Record<string, unknown>
): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  const filterStr = filters ? JSON.stringify(filters) : "";
  const hash = createHash("sha256")
    .update(`${normalized}:${filterStr}`)
    .digest("hex")
    .slice(0, 32);
  return SearchCacheKeys.search(teamId, hash);
}

export class SearchCache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async get(
    teamId: string,
    query: string,
    filters?: Record<string, unknown>
  ): Promise<CachedSearchResult | null> {
    try {
      const client = await this.getClient();
      const key = createSearchKey(teamId, query, filters);
      const data = await client.get(key);
      if (!data) {
        return null;
      }

      const parsed = CachedSearchResultSchema.safeParse(JSON.parse(data));
      if (!parsed.success) {
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }

  async set(
    teamId: string,
    query: string,
    result: CachedSearchResult,
    filters?: Record<string, unknown>
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const key = createSearchKey(teamId, query, filters);
      await client.set(key, JSON.stringify(result), {
        EX: SEARCH_CACHE_TTL_SECONDS,
      });
    } catch {
      return;
    }
  }

  async invalidateTeam(teamId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const pattern = `search:${teamId}:*`;
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch {
      return;
    }
  }

  async delete(
    teamId: string,
    query: string,
    filters?: Record<string, unknown>
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const key = createSearchKey(teamId, query, filters);
      await client.del(key);
    } catch {
      return;
    }
  }
}

let searchCacheInstance: SearchCache | null = null;

export function getSearchCache(): SearchCache {
  if (!searchCacheInstance) {
    searchCacheInstance = new SearchCache();
  }
  return searchCacheInstance;
}

export function resetSearchCache(): void {
  searchCacheInstance = null;
}
