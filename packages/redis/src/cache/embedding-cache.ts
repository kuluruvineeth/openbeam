import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { z } from "zod";
import { getRedisClient } from "../client";
import {
  EmbeddingCacheKeys,
  TWENTY_FOUR_HOURS_SECONDS,
} from "./embedding-cache-keys";

const CachedEmbeddingSchema = z.object({
  embedding: z.array(z.number()),
  model: z.string(),
  dimensions: z.number(),
  cachedAt: z.number(),
});

function safeJsonParse(data: string): unknown | null {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

type CachedEmbedding = z.infer<typeof CachedEmbeddingSchema>;

function createEmbeddingKey(text: string, model: string): string {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, " ");
  const hash = createHash("sha256")
    .update(`${model}:${normalized}`)
    .digest("hex")
    .slice(0, 32);
  return EmbeddingCacheKeys.embedding(model, hash);
}

export class EmbeddingCache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async get(text: string, model: string): Promise<number[] | null> {
    try {
      const client = await this.getClient();
      const key = createEmbeddingKey(text, model);
      const data = await client.get(key);
      if (!data) {
        return null;
      }

      const parsed = CachedEmbeddingSchema.safeParse(JSON.parse(data));
      if (!parsed.success) {
        return null;
      }

      return parsed.data.embedding;
    } catch {
      return null;
    }
  }

  async set(text: string, model: string, embedding: number[]): Promise<void> {
    try {
      const client = await this.getClient();
      const key = createEmbeddingKey(text, model);
      const cached: CachedEmbedding = {
        embedding,
        model,
        dimensions: embedding.length,
        cachedAt: Date.now(),
      };
      await client.set(key, JSON.stringify(cached), {
        EX: TWENTY_FOUR_HOURS_SECONDS,
      });
    } catch {
      return;
    }
  }

  async getBatch(
    texts: string[],
    model: string
  ): Promise<Map<string, number[]>> {
    const result = new Map<string, number[]>();
    if (texts.length === 0) {
      return result;
    }

    try {
      const client = await this.getClient();
      const keys = texts.map((t) => createEmbeddingKey(t, model));
      const values = await client.mGet(keys);

      for (let i = 0; i < texts.length; i++) {
        const data = values[i];
        const text = texts[i];
        if (data == null || text === undefined) {
          continue;
        }

        const parsed = CachedEmbeddingSchema.safeParse(safeJsonParse(data));
        if (parsed.success) {
          result.set(text, parsed.data.embedding);
        }
      }
    } catch {
      return result;
    }

    return result;
  }

  async setBatch(
    entries: Array<{ text: string; embedding: number[] }>,
    model: string
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    try {
      const client = await this.getClient();
      const pipeline = client.multi();

      for (const entry of entries) {
        const key = createEmbeddingKey(entry.text, model);
        const cached: CachedEmbedding = {
          embedding: entry.embedding,
          model,
          dimensions: entry.embedding.length,
          cachedAt: Date.now(),
        };
        pipeline.set(key, JSON.stringify(cached), {
          EX: TWENTY_FOUR_HOURS_SECONDS,
        });
      }

      await pipeline.exec();
    } catch {
      return;
    }
  }

  async delete(text: string, model: string): Promise<void> {
    try {
      const client = await this.getClient();
      const key = createEmbeddingKey(text, model);
      await client.del(key);
    } catch {
      return;
    }
  }
}

let embeddingCacheInstance: EmbeddingCache | null = null;

export function getEmbeddingCache(): EmbeddingCache {
  if (!embeddingCacheInstance) {
    embeddingCacheInstance = new EmbeddingCache();
  }
  return embeddingCacheInstance;
}

export function resetEmbeddingCache(): void {
  embeddingCacheInstance = null;
}
