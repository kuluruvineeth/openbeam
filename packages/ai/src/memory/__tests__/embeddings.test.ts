import { beforeEach, describe, expect, it } from "bun:test";
import {
  CachedEmbeddingProvider,
  createCachedEmbeddingProvider,
  EmbeddingCache,
  embedBatch,
} from "../embeddings";
import { MockEmbeddingProvider } from "../long-term";

describe("EmbeddingCache", () => {
  let cache: EmbeddingCache;

  beforeEach(() => {
    cache = new EmbeddingCache({ maxEntries: 5 });
  });

  describe("get and set", () => {
    it("stores and retrieves embeddings", () => {
      const embedding = [0.1, 0.2, 0.3];
      cache.set("hello", embedding);

      const result = cache.get("hello");
      expect(result).toEqual(embedding);
    });

    it("returns null for missing entries", () => {
      const result = cache.get("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("has", () => {
    it("returns true for cached entries", () => {
      cache.set("hello", [0.1]);
      expect(cache.has("hello")).toBe(true);
    });

    it("returns false for missing entries", () => {
      expect(cache.has("missing")).toBe(false);
    });
  });

  describe("eviction", () => {
    it("evicts oldest entry when full", () => {
      for (let i = 0; i < 5; i++) {
        cache.set(`key-${i}`, [i]);
      }

      cache.set("overflow", [99]);

      expect(cache.has("key-0")).toBe(false);
      expect(cache.has("key-1")).toBe(true);
      expect(cache.has("overflow")).toBe(true);
      expect(cache.size).toBe(5);
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      cache.set("a", [1]);
      cache.set("b", [2]);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get("a")).toBeNull();
    });
  });

  describe("size", () => {
    it("reports correct size", () => {
      expect(cache.size).toBe(0);

      cache.set("a", [1]);
      expect(cache.size).toBe(1);

      cache.set("b", [2]);
      expect(cache.size).toBe(2);
    });
  });
});

describe("CachedEmbeddingProvider", () => {
  let mockProvider: MockEmbeddingProvider;
  let cachedProvider: CachedEmbeddingProvider;

  beforeEach(() => {
    mockProvider = new MockEmbeddingProvider();
    cachedProvider = new CachedEmbeddingProvider({
      provider: mockProvider,
    });
  });

  it("generates embedding on first call", async () => {
    const result = await cachedProvider.embed("hello");

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns cached embedding on second call", async () => {
    const first = await cachedProvider.embed("hello");
    const second = await cachedProvider.embed("hello");

    expect(first).toEqual(second);
  });

  it("generates different embeddings for different text", async () => {
    const result1 = await cachedProvider.embed("hello");
    const result2 = await cachedProvider.embed("goodbye");

    expect(result1).not.toEqual(result2);
  });

  it("exposes the underlying cache", () => {
    const cache = cachedProvider.getCache();
    expect(cache).toBeInstanceOf(EmbeddingCache);
  });
});

describe("embedBatch", () => {
  let mockProvider: MockEmbeddingProvider;

  beforeEach(() => {
    mockProvider = new MockEmbeddingProvider();
  });

  it("embeds multiple texts", async () => {
    const results = await embedBatch(["hello", "world", "test"], {
      provider: mockProvider,
    });

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("uses cache when provided", async () => {
    const cache = new EmbeddingCache();

    const firstResults = await embedBatch(["hello", "world"], {
      provider: mockProvider,
      cache,
    });

    expect(cache.size).toBe(2);

    const secondResults = await embedBatch(["hello", "world", "new"], {
      provider: mockProvider,
      cache,
    });

    expect(secondResults[0]).toEqual(firstResults[0]);
    expect(secondResults[1]).toEqual(firstResults[1]);
    expect(cache.size).toBe(3);
  });

  it("handles empty input", async () => {
    const results = await embedBatch([], {
      provider: mockProvider,
    });

    expect(results).toHaveLength(0);
  });

  it("respects batch size", async () => {
    const texts = Array.from({ length: 10 }, (_, i) => `text-${i}`);

    const results = await embedBatch(texts, {
      provider: mockProvider,
      batchSize: 3,
    });

    expect(results).toHaveLength(10);
  });

  it("returns empty arrays for undefined text entries", async () => {
    const texts = ["hello", "", "world"];

    const results = await embedBatch(texts, {
      provider: mockProvider,
    });

    expect(results).toHaveLength(3);
    expect(results[0]?.length).toBeGreaterThan(0);
    expect(results[2]?.length).toBeGreaterThan(0);
  });
});

describe("createCachedEmbeddingProvider", () => {
  it("creates a cached provider", () => {
    const provider = createCachedEmbeddingProvider(new MockEmbeddingProvider());

    expect(provider).toBeInstanceOf(CachedEmbeddingProvider);
  });

  it("accepts custom cache options", () => {
    const provider = createCachedEmbeddingProvider(
      new MockEmbeddingProvider(),
      { maxEntries: 100 }
    );

    expect(provider.getCache()).toBeInstanceOf(EmbeddingCache);
  });
});
