/**
 * Search Result Cache
 *
 * Caches search results and suggestions for improved performance.
 * Supports cache warming and intelligent invalidation.
 */
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

// === Types ===

export interface CachedSearchResult {
  query: string;
  filters: Record<string, unknown>;
  results: SearchResultItem[];
  totalCount: number;
  rankProfile: string;
  cachedAt: number;
  hitCount: number;
}

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  snippet: string;
  score: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchSuggestion {
  text: string;
  type: "query" | "person" | "document" | "action";
  entityId?: string;
  score: number;
}

// === Search Cache ===

export class SearchCache {
  private client: RedisClientType | null = null;
  private readonly PREFIX = "search:";
  private readonly SUGGESTION_PREFIX = "suggest:";
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly SUGGESTION_TTL = 3600; // 1 hour

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  /**
   * Generate a cache key for a search query
   */
  private generateKey(
    teamId: string,
    query: string,
    filters: Record<string, unknown>,
    rankProfile: string
  ): string {
    const filterHash = this.hashObject(filters);
    const queryNorm = query.toLowerCase().trim();
    return `${this.PREFIX}${teamId}:${queryNorm}:${filterHash}:${rankProfile}`;
  }

  /**
   * Hash an object for cache key generation
   */
  private hashObject(obj: Record<string, unknown>): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached search results
   */
  async get(
    teamId: string,
    query: string,
    filters: Record<string, unknown>,
    rankProfile: string
  ): Promise<CachedSearchResult | null> {
    const client = await this.getClient();
    const key = this.generateKey(teamId, query, filters, rankProfile);

    try {
      const data = await client.get(key);
      if (!data) return null;

      const result = JSON.parse(data) as CachedSearchResult;

      // Increment hit count asynchronously
      client
        .hIncrBy(`${key}:meta`, "hitCount", 1)
        .catch((e) => console.error("Hit count increment failed:", e));

      return result;
    } catch (error) {
      console.error("Search cache get error:", error);
      return null;
    }
  }

  /**
   * Cache search results
   */
  async set(
    teamId: string,
    query: string,
    filters: Record<string, unknown>,
    rankProfile: string,
    results: SearchResultItem[],
    totalCount: number,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const client = await this.getClient();
    const key = this.generateKey(teamId, query, filters, rankProfile);

    const cacheData: CachedSearchResult = {
      query,
      filters,
      results,
      totalCount,
      rankProfile,
      cachedAt: Date.now(),
      hitCount: 0,
    };

    try {
      await client.set(key, JSON.stringify(cacheData), { EX: ttl });
    } catch (error) {
      console.error("Search cache set error:", error);
    }
  }

  /**
   * Invalidate search cache for a team
   */
  async invalidateTeam(teamId: string): Promise<number> {
    const client = await this.getClient();
    const pattern = `${this.PREFIX}${teamId}:*`;

    try {
      let count = 0;
      const iterator = client.scanIterator({ MATCH: pattern, COUNT: 100 });

      for await (const key of iterator) {
        await client.del(String(key));
        count++;
      }

      return count;
    } catch (error) {
      console.error("Search cache invalidate error:", error);
      return 0;
    }
  }

  /**
   * Invalidate cache for specific documents (when documents are updated)
   */
  async invalidateDocuments(
    teamId: string,
    _documentIds: string[]
  ): Promise<number> {
    // For now, invalidate all team cache
    // In production, you'd want more granular invalidation based on document content
    return await this.invalidateTeam(teamId);
  }

  // === Suggestions ===

  /**
   * Get search suggestions
   */
  async getSuggestions(
    teamId: string,
    prefix: string,
    limit = 10
  ): Promise<SearchSuggestion[]> {
    const client = await this.getClient();
    const key = `${this.SUGGESTION_PREFIX}${teamId}`;

    try {
      // Use sorted set for weighted suggestions
      const results = await client.zRangeByScore(key, 0, "+inf", {
        LIMIT: { offset: 0, count: limit * 3 }, // Fetch more to filter
      });

      // Filter by prefix and parse
      const suggestions: SearchSuggestion[] = [];
      const prefixLower = prefix.toLowerCase();

      for (const item of results) {
        try {
          const suggestion = JSON.parse(String(item)) as SearchSuggestion;
          if (suggestion.text.toLowerCase().startsWith(prefixLower)) {
            suggestions.push(suggestion);
            if (suggestions.length >= limit) break;
          }
        } catch {
          // Skip malformed entries
        }
      }

      return suggestions;
    } catch (error) {
      console.error("Get suggestions error:", error);
      return [];
    }
  }

  /**
   * Add or update a search suggestion
   */
  async addSuggestion(
    teamId: string,
    suggestion: SearchSuggestion
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.SUGGESTION_PREFIX}${teamId}`;

    try {
      const member = JSON.stringify(suggestion);
      await client.zAdd(key, { score: suggestion.score, value: member });
      await client.expire(key, this.SUGGESTION_TTL);
    } catch (error) {
      console.error("Add suggestion error:", error);
    }
  }

  /**
   * Bulk add suggestions
   */
  async addSuggestionsBulk(
    teamId: string,
    suggestions: SearchSuggestion[]
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.SUGGESTION_PREFIX}${teamId}`;

    try {
      const members = suggestions.map((s) => ({
        score: s.score,
        value: JSON.stringify(s),
      }));

      await client.zAdd(key, members);
      await client.expire(key, this.SUGGESTION_TTL);
    } catch (error) {
      console.error("Bulk add suggestions error:", error);
    }
  }

  /**
   * Record a successful search (for learning popular queries)
   */
  async recordSearchQuery(
    teamId: string,
    query: string,
    hadResults: boolean
  ): Promise<void> {
    if (!hadResults) return;

    const client = await this.getClient();
    const key = `${this.SUGGESTION_PREFIX}${teamId}:popular`;

    try {
      await client.zIncrBy(key, 1, query.toLowerCase().trim());
      await client.expire(key, 86_400 * 7); // Keep for 7 days
    } catch (error) {
      console.error("Record search query error:", error);
    }
  }

  /**
   * Get popular queries
   */
  async getPopularQueries(teamId: string, limit = 10): Promise<string[]> {
    const client = await this.getClient();
    const key = `${this.SUGGESTION_PREFIX}${teamId}:popular`;

    try {
      const results = await client.zRange(key, 0, limit - 1, { REV: true });
      return results.map(String);
    } catch (error) {
      console.error("Get popular queries error:", error);
      return [];
    }
  }
}

// Export singleton
export const searchCache = new SearchCache();
