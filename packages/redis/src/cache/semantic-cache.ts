import type { RedisClientType } from "redis";
import { z } from "zod";
import { getRedisClient } from "../client";
import type { CachedAnswer } from "./rag-cache";
import {
  MAX_ENTRIES_PER_TEAM,
  ONE_HOUR_SECONDS,
  SemanticCacheKeys,
  SIMILARITY_THRESHOLD,
} from "./semantic-cache-keys";

const CachedAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(z.unknown()),
  groundingScore: z.number().nullable(),
  confidence: z.string().nullable(),
  generatedAt: z.number(),
});

const SemanticCacheEntrySchema = z.object({
  queryEmbedding: z.array(z.number()),
  queryText: z.string(),
  response: CachedAnswerSchema,
  hitCount: z.number(),
  createdAt: z.number(),
  lastAccessedAt: z.number(),
});

function safeJsonParse(data: string): unknown | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

type SemanticCacheEntry = z.infer<typeof SemanticCacheEntrySchema>;

export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }
  if (a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function createEntryId(queryText: string): string {
  const normalized = queryText.toLowerCase().trim().replace(/\s+/g, " ");
  return Buffer.from(normalized).toString("base64url").slice(0, 32);
}

interface BestMatchCandidate {
  entry: SemanticCacheEntry;
  similarity: number;
  entryId: string;
}

function findBestMatchInEntries(
  entries: (string | null)[],
  entryIds: string[],
  queryEmbedding: number[],
  threshold: number
): BestMatchCandidate | null {
  let bestMatch: BestMatchCandidate | null = null;

  for (let i = 0; i < entries.length; i += 1) {
    const data = entries[i];
    const entryId = entryIds[i];
    if (data == null || entryId === undefined) {
      continue;
    }

    const parsed = SemanticCacheEntrySchema.safeParse(JSON.parse(data));
    if (!parsed.success) {
      continue;
    }

    const similarity = computeCosineSimilarity(
      queryEmbedding,
      parsed.data.queryEmbedding
    );

    const isBetterMatch =
      similarity >= threshold &&
      (!bestMatch || similarity > bestMatch.similarity);

    if (isBetterMatch) {
      bestMatch = { entry: parsed.data, similarity, entryId };
    }
  }

  return bestMatch;
}

export class SemanticCache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async findSimilar(
    teamId: string,
    queryEmbedding: number[],
    threshold = SIMILARITY_THRESHOLD
  ): Promise<{ entry: SemanticCacheEntry; similarity: number } | null> {
    try {
      const client = await this.getClient();
      const indexKey = SemanticCacheKeys.index(teamId);

      const entryIds = await client.sMembers(indexKey);
      if (entryIds.length === 0) {
        return null;
      }

      const keys = entryIds.map((id) => SemanticCacheKeys.entry(teamId, id));
      const entries = await client.mGet(keys);

      const bestMatch = findBestMatchInEntries(
        entries,
        entryIds,
        queryEmbedding,
        threshold
      );

      if (bestMatch) {
        await this.recordAccess(teamId, bestMatch.entryId, bestMatch.entry);
        return { entry: bestMatch.entry, similarity: bestMatch.similarity };
      }

      return null;
    } catch {
      return null;
    }
  }

  async store(
    teamId: string,
    queryText: string,
    queryEmbedding: number[],
    response: CachedAnswer
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const entryId = createEntryId(queryText);
      const indexKey = SemanticCacheKeys.index(teamId);
      const entryKey = SemanticCacheKeys.entry(teamId, entryId);

      const entry: SemanticCacheEntry = {
        queryEmbedding,
        queryText,
        response,
        hitCount: 0,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      await client.sAdd(indexKey, entryId);
      await client.set(entryKey, JSON.stringify(entry), {
        EX: ONE_HOUR_SECONDS,
      });

      await this.enforceMaxEntries(teamId, client);
    } catch {
      return;
    }
  }

  private async recordAccess(
    teamId: string,
    entryId: string,
    entry: SemanticCacheEntry
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const entryKey = SemanticCacheKeys.entry(teamId, entryId);

      entry.hitCount += 1;
      entry.lastAccessedAt = Date.now();

      await client.set(entryKey, JSON.stringify(entry), {
        EX: ONE_HOUR_SECONDS,
      });
    } catch {
      return;
    }
  }

  private async enforceMaxEntries(
    teamId: string,
    client: RedisClientType
  ): Promise<void> {
    try {
      const indexKey = SemanticCacheKeys.index(teamId);
      const count = await client.sCard(indexKey);

      if (count <= MAX_ENTRIES_PER_TEAM) {
        return;
      }

      const entryIds = await client.sMembers(indexKey);
      const keys = entryIds.map((id) => SemanticCacheKeys.entry(teamId, id));
      const entries = await client.mGet(keys);

      const ONE_HOUR_MS = 3_600_000;
      const scored: Array<{ id: string; score: number }> = [];

      for (let i = 0; i < entryIds.length; i++) {
        const data = entries[i];
        if (!data) {
          continue;
        }

        const parsed = SemanticCacheEntrySchema.safeParse(safeJsonParse(data));
        if (!parsed.success) {
          continue;
        }

        const age = Date.now() - parsed.data.lastAccessedAt;
        const score = parsed.data.hitCount / (1 + age / ONE_HOUR_MS);
        const entryId = entryIds[i];
        if (entryId !== undefined) {
          scored.push({ id: entryId, score });
        }
      }

      scored.sort((a, b) => a.score - b.score);
      const toRemove = scored.slice(0, count - MAX_ENTRIES_PER_TEAM);

      for (const item of toRemove) {
        await client.sRem(indexKey, item.id);
        await client.del(SemanticCacheKeys.entry(teamId, item.id));
      }
    } catch {
      return;
    }
  }

  async invalidateTeam(teamId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const indexKey = SemanticCacheKeys.index(teamId);
      const entryIds = await client.sMembers(indexKey);

      if (entryIds.length > 0) {
        const keys = entryIds.map((id) => SemanticCacheKeys.entry(teamId, id));
        await client.del([indexKey, ...keys]);
      }
    } catch {
      return;
    }
  }

  async getStats(teamId: string): Promise<{
    entryCount: number;
    totalHits: number;
    avgHitsPerEntry: number;
  }> {
    try {
      const client = await this.getClient();
      const indexKey = SemanticCacheKeys.index(teamId);
      const entryIds = await client.sMembers(indexKey);

      if (entryIds.length === 0) {
        return { entryCount: 0, totalHits: 0, avgHitsPerEntry: 0 };
      }

      const keys = entryIds.map((id) => SemanticCacheKeys.entry(teamId, id));
      const entries = await client.mGet(keys);

      let totalHits = 0;
      let validEntries = 0;

      for (const data of entries) {
        if (!data) {
          continue;
        }

        const parsed = SemanticCacheEntrySchema.safeParse(safeJsonParse(data));
        if (!parsed.success) {
          continue;
        }
        totalHits += parsed.data.hitCount;
        validEntries += 1;
      }

      return {
        entryCount: validEntries,
        totalHits,
        avgHitsPerEntry: validEntries > 0 ? totalHits / validEntries : 0,
      };
    } catch {
      return { entryCount: 0, totalHits: 0, avgHitsPerEntry: 0 };
    }
  }
}

let semanticCacheInstance: SemanticCache | null = null;

export function getSemanticCache(): SemanticCache {
  if (!semanticCacheInstance) {
    semanticCacheInstance = new SemanticCache();
  }
  return semanticCacheInstance;
}

export function resetSemanticCache(): void {
  semanticCacheInstance = null;
}
