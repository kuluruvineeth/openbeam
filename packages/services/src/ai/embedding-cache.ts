import { createHash } from "node:crypto";
import type { Embedding } from "@openbeam/ai";
import { cache } from "@openbeam/redis";
import { logger } from "../lib/logger";
import type { CachedEmbedding } from "./types";

const CACHE_PREFIX = "embedding";
const DEFAULT_TTL = 60 * 60 * 24 * 7;

function getCacheKey(text: string, modelId: string): string {
  const hash = createHash("sha256")
    .update(`${modelId}:${text}`)
    .digest("hex")
    .slice(0, 32);
  return `${CACHE_PREFIX}:${hash}`;
}

export async function getCachedEmbedding(
  text: string,
  modelId: string
): Promise<Embedding | null> {
  const key = getCacheKey(text, modelId);

  try {
    const cached = await cache.get<CachedEmbedding>(key);
    if (cached?.embedding) {
      return cached.embedding;
    }
  } catch (error) {
    logger.warn({ error }, "Embedding cache get error");
  }

  return null;
}

export async function setCachedEmbedding(
  text: string,
  modelId: string,
  embedding: Embedding,
  ttl = DEFAULT_TTL
): Promise<void> {
  const key = getCacheKey(text, modelId);

  const entry: CachedEmbedding = {
    embedding,
    text,
    modelId,
    createdAt: Date.now(),
  };

  try {
    await cache.set(key, entry, ttl);
  } catch (error) {
    logger.warn({ error }, "Embedding cache set error");
  }
}

export async function getOrGenerateEmbedding(
  text: string,
  modelId: string,
  generateFn: () => Promise<Embedding>,
  ttl = DEFAULT_TTL
): Promise<Embedding> {
  const cached = await getCachedEmbedding(text, modelId);
  if (cached) {
    return cached;
  }

  const embedding = await generateFn();

  setCachedEmbedding(text, modelId, embedding, ttl).catch(() => {
    // Ignore errors
  });

  return embedding;
}

export async function getBatchCachedEmbeddings(
  texts: string[],
  modelId: string
): Promise<Map<string, Embedding>> {
  const results = new Map<string, Embedding>();

  const keys = texts.map((text) => getCacheKey(text, modelId));

  try {
    const cached = await cache.mget<CachedEmbedding>(keys);

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const entry = cached[i];
      if (text && entry?.embedding) {
        results.set(text, entry.embedding);
      }
    }
  } catch (error) {
    logger.warn({ error }, "Batch embedding cache get error");
  }

  return results;
}

export async function setBatchCachedEmbeddings(
  entries: Array<{ text: string; embedding: Embedding }>,
  modelId: string,
  ttl = DEFAULT_TTL
): Promise<void> {
  if (entries.length === 0) {
    return;
  }

  try {
    const operations = entries.map(({ text, embedding }) => ({
      key: getCacheKey(text, modelId),
      value: {
        embedding,
        text,
        modelId,
        createdAt: Date.now(),
      } satisfies CachedEmbedding,
      ttl,
    }));

    await cache.mset(operations);
  } catch (error) {
    logger.warn({ error }, "Batch embedding cache set error");
  }
}

export async function invalidateCachedEmbedding(
  text: string,
  modelId: string
): Promise<void> {
  const key = getCacheKey(text, modelId);
  try {
    await cache.del(key);
  } catch (error) {
    logger.warn({ error }, "Embedding cache delete error");
  }
}
