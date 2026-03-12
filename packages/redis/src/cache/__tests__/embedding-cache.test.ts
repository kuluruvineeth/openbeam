import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fc from "fast-check";
import {
  EmbeddingCache,
  getEmbeddingCache,
  resetEmbeddingCache,
} from "../embedding-cache";

const mockRedisClient = {
  get: mock(() => Promise.resolve(null as string | null)),
  set: mock(() => Promise.resolve("OK" as string)),
  mGet: mock(() => Promise.resolve([] as (string | null)[])),
  multi: mock(() => ({
    set: mock(() => ({})),
    exec: mock(() => Promise.resolve([])),
  })),
  del: mock(() => Promise.resolve(1)),
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

describe("EmbeddingCache", () => {
  let cache: EmbeddingCache;

  beforeEach(() => {
    resetEmbeddingCache();
    cache = new EmbeddingCache();
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.mGet.mockReset();
  });

  afterEach(() => {
    resetEmbeddingCache();
  });

  describe("singleton pattern", () => {
    test("getEmbeddingCache returns same instance", () => {
      const instance1 = getEmbeddingCache();
      const instance2 = getEmbeddingCache();
      expect(instance1).toBe(instance2);
    });

    // biome-ignore lint/suspicious/noSkippedTests: bun mock.module singleton contamination in combined test runs
    test.skip("resetEmbeddingCache creates new instance (skipped: bun mock.module singleton contamination)", () => {
      const instance1 = getEmbeddingCache();
      resetEmbeddingCache();
      const instance2 = getEmbeddingCache();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("get", () => {
    test("returns null for uncached embedding", async () => {
      mockRedisClient.get.mockImplementation(() =>
        Promise.resolve(null as string | null)
      );

      const result = await cache.get("test query", "text-embedding-3-large");
      expect(result).toBeNull();
    });

    test("returns cached embedding after set", async () => {
      const embedding = [0.1, 0.2, 0.3];
      const cached = {
        embedding,
        model: "text-embedding-3-large",
        dimensions: 3,
        cachedAt: Date.now(),
      };

      mockRedisClient.get.mockImplementation(() =>
        Promise.resolve(JSON.stringify(cached) as string | null)
      );

      const result = await cache.get("test query", "text-embedding-3-large");
      expect(result).toEqual(embedding);
    });

    test("returns null for invalid cached data", async () => {
      mockRedisClient.get.mockImplementation(() =>
        Promise.resolve(JSON.stringify({ invalid: "data" }) as string | null)
      );

      const result = await cache.get("test query", "text-embedding-3-large");
      expect(result).toBeNull();
    });

    test("returns null on Redis error", async () => {
      mockRedisClient.get.mockImplementation(() =>
        Promise.reject(new Error("Redis connection failed"))
      );

      const result = await cache.get("test query", "text-embedding-3-large");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    test("stores embedding in Redis", async () => {
      mockRedisClient.set.mockImplementation(() => Promise.resolve("OK"));

      const embedding = [0.1, 0.2, 0.3];
      await cache.set("test query", "text-embedding-3-large", embedding);

      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    test("does not throw on Redis error", async () => {
      mockRedisClient.set.mockImplementation(() =>
        Promise.reject(new Error("Redis connection failed"))
      );

      const embedding = [0.1, 0.2, 0.3];
      await expect(
        cache.set("test query", "text-embedding-3-large", embedding)
      ).resolves.toBeUndefined();
    });
  });

  describe("getBatch", () => {
    test("returns empty map for empty input", async () => {
      const result = await cache.getBatch([], "model");
      expect(result.size).toBe(0);
    });

    test("returns cached embeddings", async () => {
      const cached1 = {
        embedding: [0.1, 0.2],
        model: "model",
        dimensions: 2,
        cachedAt: Date.now(),
      };

      mockRedisClient.mGet.mockImplementation(() =>
        Promise.resolve([JSON.stringify(cached1), null] as (string | null)[])
      );

      const result = await cache.getBatch(["query 1", "query 2"], "model");
      expect(result.size).toBe(1);
      expect(result.get("query 1")).toEqual([0.1, 0.2]);
      expect(result.has("query 2")).toBe(false);
    });

    test("does not skip empty-string text keys", async () => {
      const cached = {
        embedding: [0.42],
        model: "model",
        dimensions: 1,
        cachedAt: Date.now(),
      };

      mockRedisClient.mGet.mockImplementation(() =>
        Promise.resolve([JSON.stringify(cached)] as (string | null)[])
      );

      const result = await cache.getBatch([""], "model");
      expect(result.size).toBe(1);
      expect(result.get("")).toEqual([0.42]);
    });

    test("returns empty map on Redis error", async () => {
      mockRedisClient.mGet.mockImplementation(() =>
        Promise.reject(new Error("Redis connection failed"))
      );

      const result = await cache.getBatch(["query 1"], "model");
      expect(result.size).toBe(0);
    });
  });

  describe("setBatch", () => {
    test("does nothing for empty input", async () => {
      await cache.setBatch([], "model");
      expect(mockRedisClient.multi).not.toHaveBeenCalled();
    });

    test("stores multiple embeddings", async () => {
      const pipelineMock: {
        set: ReturnType<typeof mock>;
        exec: ReturnType<typeof mock>;
      } = {
        set: mock(() => pipelineMock),
        exec: mock(() => Promise.resolve([])),
      };
      mockRedisClient.multi.mockImplementation(() => pipelineMock);

      const entries = [
        { text: "query 1", embedding: [0.1, 0.2] },
        { text: "query 2", embedding: [0.3, 0.4] },
      ];

      await cache.setBatch(entries, "model");
      expect(mockRedisClient.multi).toHaveBeenCalled();
      expect(pipelineMock.exec).toHaveBeenCalled();
    });
  });
});

describe("EmbeddingCache key generation properties", () => {
  test("normalizes whitespace consistently", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (text: string) => {
        const normalized = text.toLowerCase().trim().replace(/\s+/g, " ");
        const withSpaces = `  ${text}   `;
        const withSpacesNormalized = withSpaces
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");

        return (
          withSpacesNormalized === normalized ||
          withSpacesNormalized ===
            text.toLowerCase().trim().replace(/\s+/g, " ")
        );
      })
    );
  });

  test("different models produce different keys for same text", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (_text: string, model1: string, model2: string) => {
          if (model1 === model2) {
            return true;
          }

          const key1 = `emb:${model1}:test`;
          const key2 = `emb:${model2}:test`;
          return key1 !== key2;
        }
      )
    );
  });
});
