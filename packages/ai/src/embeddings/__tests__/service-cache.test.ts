import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { EmbeddingService } from "../service";

const TEST_EMBEDDING = [0.1, 0.2, 0.3, 0.4, 0.5];
const TEST_MODEL_ID = "text-embedding-3-small";

class MockEmbeddingCache {
  private readonly store = new Map<string, number[]>();

  get(text: string, model: string): Promise<number[] | null> {
    return Promise.resolve(this.store.get(`${model}:${text}`) ?? null);
  }

  set(text: string, model: string, embedding: number[]): Promise<void> {
    this.store.set(`${model}:${text}`, embedding);
    return Promise.resolve();
  }

  getBatch(texts: string[], model: string): Promise<Map<string, number[]>> {
    const result = new Map<string, number[]>();
    for (const text of texts) {
      const cached = this.store.get(`${model}:${text}`);
      if (cached) {
        result.set(text, cached);
      }
    }
    return Promise.resolve(result);
  }

  setBatch(
    items: Array<{ text: string; embedding: number[] }>,
    model: string
  ): Promise<void> {
    for (const item of items) {
      this.store.set(`${model}:${item.text}`, item.embedding);
    }
    return Promise.resolve();
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

describe("EmbeddingService cache integration", () => {
  let service: EmbeddingService;
  let mockCache: MockEmbeddingCache;
  let embedSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockCache = new MockEmbeddingCache();
    mock.module("@openplane/redis", () => ({
      getEmbeddingCache: () => mockCache,
    }));

    service = new EmbeddingService({
      modelId: TEST_MODEL_ID,
    });

    embedSpy = spyOn(service, "embed").mockResolvedValue({
      embedding: TEST_EMBEDDING,
      text: "test",
      tokenCount: 5,
    });
  });

  describe("embedWithCache", () => {
    it("returns cached result when available", async () => {
      const text = "cached query";
      await mockCache.set(text, TEST_MODEL_ID, TEST_EMBEDDING);

      const result = await service.embedWithCache(text);

      expect(result.fromCache).toBe(true);
      expect(result.embedding).toEqual(TEST_EMBEDDING);
      expect(result.tokenCount).toBe(0);
      expect(embedSpy).not.toHaveBeenCalled();
    });

    it("fetches and caches when not in cache", async () => {
      const text = "new query";

      const result = await service.embedWithCache(text);

      expect(result.fromCache).toBe(false);
      expect(result.embedding).toEqual(TEST_EMBEDDING);
      expect(embedSpy).toHaveBeenCalledWith(text);

      const cachedValue = await mockCache.get(text, TEST_MODEL_ID);
      expect(cachedValue).toEqual(TEST_EMBEDDING);
    });

    it("preserves token count from fresh embedding", async () => {
      const text = "fresh query";
      embedSpy.mockResolvedValue({
        embedding: TEST_EMBEDDING,
        text,
        tokenCount: 10,
      });

      const result = await service.embedWithCache(text);

      expect(result.tokenCount).toBe(10);
      expect(result.fromCache).toBe(false);
    });
  });

  describe("embedQueryWithCache", () => {
    it("returns embedding from cache", async () => {
      const query = "cached search";
      await mockCache.set(query, TEST_MODEL_ID, TEST_EMBEDDING);

      const embedding = await service.embedQueryWithCache(query);

      expect(embedding).toEqual(TEST_EMBEDDING);
      expect(embedSpy).not.toHaveBeenCalled();
    });

    it("returns embedding from fresh request", async () => {
      const query = "new search";

      const embedding = await service.embedQueryWithCache(query);

      expect(embedding).toEqual(TEST_EMBEDDING);
      expect(embedSpy).toHaveBeenCalledWith(query);
    });
  });

  describe("embedBatchWithCache", () => {
    it("returns empty result for empty input", async () => {
      const result = await service.embedBatchWithCache([]);

      expect(result.embeddings).toEqual([]);
      expect(result.texts).toEqual([]);
      expect(result.totalTokens).toBe(0);
      expect(result.cacheHits).toBe(0);
    });

    it("uses cache for all hits", async () => {
      const texts = ["text1", "text2", "text3"];
      for (const text of texts) {
        await mockCache.set(text, TEST_MODEL_ID, TEST_EMBEDDING);
      }

      const embedBatchSpy = spyOn(service, "embedBatch");
      const result = await service.embedBatchWithCache(texts);

      expect(result.cacheHits).toBe(3);
      expect(result.totalTokens).toBe(0);
      expect(result.embeddings).toHaveLength(3);
      expect(embedBatchSpy).not.toHaveBeenCalled();
    });

    it("fetches uncached texts only", async () => {
      const texts = ["cached", "uncached1", "uncached2"];
      await mockCache.set("cached", TEST_MODEL_ID, [1, 2, 3]);

      const embedBatchSpy = spyOn(service, "embedBatch").mockResolvedValue({
        embeddings: [
          [4, 5, 6],
          [7, 8, 9],
        ],
        texts: ["uncached1", "uncached2"],
        totalTokens: 20,
      });

      const result = await service.embedBatchWithCache(texts);

      expect(result.cacheHits).toBe(1);
      expect(result.totalTokens).toBe(20);
      expect(embedBatchSpy).toHaveBeenCalledWith(["uncached1", "uncached2"]);
      expect(result.embeddings[0]).toEqual([1, 2, 3]);
      expect(result.embeddings[1]).toEqual([4, 5, 6]);
      expect(result.embeddings[2]).toEqual([7, 8, 9]);
    });

    it("caches newly fetched embeddings", async () => {
      const texts = ["new1", "new2"];
      spyOn(service, "embedBatch").mockResolvedValue({
        embeddings: [
          [1, 1, 1],
          [2, 2, 2],
        ],
        texts,
        totalTokens: 10,
      });

      await service.embedBatchWithCache(texts);

      const cached1 = await mockCache.get("new1", TEST_MODEL_ID);
      const cached2 = await mockCache.get("new2", TEST_MODEL_ID);
      expect(cached1).toEqual([1, 1, 1]);
      expect(cached2).toEqual([2, 2, 2]);
    });

    it("maintains correct order with mixed cache hits", async () => {
      const texts = ["a", "b", "c", "d"];
      await mockCache.set("b", TEST_MODEL_ID, [2, 2, 2]);
      await mockCache.set("d", TEST_MODEL_ID, [4, 4, 4]);

      spyOn(service, "embedBatch").mockResolvedValue({
        embeddings: [
          [1, 1, 1],
          [3, 3, 3],
        ],
        texts: ["a", "c"],
        totalTokens: 8,
      });

      const result = await service.embedBatchWithCache(texts);

      expect(result.embeddings[0]).toEqual([1, 1, 1]);
      expect(result.embeddings[1]).toEqual([2, 2, 2]);
      expect(result.embeddings[2]).toEqual([3, 3, 3]);
      expect(result.embeddings[3]).toEqual([4, 4, 4]);
      expect(result.cacheHits).toBe(2);
    });
  });
});
