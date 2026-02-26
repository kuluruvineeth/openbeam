import type { EmbeddingProvider } from "./long-term";

const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_CACHE_MAX_ENTRIES = 10_000;

export interface EmbeddingCacheOptions {
  maxEntries?: number;
}

export class EmbeddingCache {
  private readonly cache = new Map<string, number[]>();
  private readonly maxEntries: number;

  constructor(options?: EmbeddingCacheOptions) {
    this.maxEntries = options?.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES;
  }

  get(text: string): number[] | null {
    const value = this.cache.get(text);
    if (value === undefined) {
      return null;
    }
    this.cache.delete(text);
    this.cache.set(text, value);
    return value;
  }

  set(text: string, embedding: number[]): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(text, embedding);
  }

  has(text: string): boolean {
    return this.cache.has(text);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export interface CachedEmbeddingProviderOptions {
  provider: EmbeddingProvider;
  cache?: EmbeddingCache;
}

export class CachedEmbeddingProvider implements EmbeddingProvider {
  private readonly provider: EmbeddingProvider;
  private readonly cache: EmbeddingCache;

  constructor(options: CachedEmbeddingProviderOptions) {
    this.provider = options.provider;
    this.cache = options.cache ?? new EmbeddingCache();
  }

  async embed(text: string): Promise<number[]> {
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    const embedding = await this.provider.embed(text);
    this.cache.set(text, embedding);
    return embedding;
  }

  getCache(): EmbeddingCache {
    return this.cache;
  }
}

export interface BatchEmbeddingOptions {
  provider: EmbeddingProvider;
  batchSize?: number;
  cache?: EmbeddingCache;
}

export async function embedBatch(
  texts: string[],
  options: BatchEmbeddingOptions
): Promise<number[][]> {
  const { provider, cache } = options;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  const results: (number[] | null)[] = Array.from<null>({
    length: texts.length,
  }).fill(null);
  const uncachedIndices: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text) {
      continue;
    }

    if (cache) {
      const cached = cache.get(text);
      if (cached) {
        results[i] = cached;
        continue;
      }
    }

    uncachedIndices.push(i);
  }

  for (let start = 0; start < uncachedIndices.length; start += batchSize) {
    const batchIndices = uncachedIndices.slice(start, start + batchSize);
    const batchTexts = batchIndices.map((i) => {
      const text = texts[i];
      if (text === undefined) {
        return "";
      }
      return text;
    });

    const embeddings = await Promise.all(
      batchTexts.map((text) => provider.embed(text))
    );

    for (let j = 0; j < batchIndices.length; j++) {
      const originalIndex = batchIndices[j];
      const embedding = embeddings[j];
      if (originalIndex === undefined || !embedding) {
        continue;
      }
      results[originalIndex] = embedding;

      const originalText = texts[originalIndex];
      if (cache && originalText) {
        cache.set(originalText, embedding);
      }
    }
  }

  return results.map((r) => r ?? []);
}

export function createCachedEmbeddingProvider(
  provider: EmbeddingProvider,
  cacheOptions?: EmbeddingCacheOptions
): CachedEmbeddingProvider {
  return new CachedEmbeddingProvider({
    provider,
    cache: new EmbeddingCache(cacheOptions),
  });
}
