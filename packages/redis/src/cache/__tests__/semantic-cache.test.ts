import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fc from "fast-check";
import {
  computeCosineSimilarity,
  getSemanticCache,
  resetSemanticCache,
  SemanticCache,
} from "../semantic-cache";

const mockRedisClient = {
  get: mock(() => Promise.resolve(null as string | null)),
  set: mock(() => Promise.resolve("OK" as string)),
  mGet: mock(() => Promise.resolve([] as (string | null)[])),
  sMembers: mock(() => Promise.resolve([] as string[])),
  sAdd: mock(() => Promise.resolve(1 as number)),
  sRem: mock(() => Promise.resolve(1 as number)),
  sCard: mock(() => Promise.resolve(0 as number)),
  del: mock(() => Promise.resolve(1 as number)),
};

mock.module("../../client", () => ({
  getRedisClient: () => Promise.resolve(mockRedisClient),
}));

describe("computeCosineSimilarity", () => {
  describe("basic cases", () => {
    test("returns 0 for mismatched dimensions", () => {
      const a = [1, 2, 3];
      const b = [1, 2];
      expect(computeCosineSimilarity(a, b)).toBe(0);
    });

    test("returns 0 for empty vectors", () => {
      expect(computeCosineSimilarity([], [])).toBe(0);
    });

    test("returns 0 for zero vectors", () => {
      const zero = [0, 0, 0];
      const nonZero = [1, 2, 3];
      expect(computeCosineSimilarity(zero, nonZero)).toBe(0);
    });

    test("returns 1 for identical vectors", () => {
      const v = [1, 2, 3, 4];
      const result = computeCosineSimilarity(v, v);
      expect(Math.abs(result - 1)).toBeLessThan(1e-10);
    });

    test("returns -1 for opposite vectors", () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      const result = computeCosineSimilarity(a, b);
      expect(Math.abs(result - -1)).toBeLessThan(1e-10);
    });

    test("returns 0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(computeCosineSimilarity(a, b)).toBe(0);
    });
  });

  describe("property-based tests", () => {
    test("is symmetric: similarity(a, b) === similarity(b, a)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: -1, max: 1, noNaN: true }), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.array(fc.float({ min: -1, max: 1, noNaN: true }), {
            minLength: 1,
            maxLength: 10,
          }),
          (a: number[], b: number[]) => {
            if (a.length !== b.length) {
              return true;
            }
            const ab = computeCosineSimilarity(a, b);
            const ba = computeCosineSimilarity(b, a);
            return Math.abs(ab - ba) < 1e-10;
          }
        )
      );
    });

    test("returns 1 for identical non-zero vectors", () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 0.1, max: 1, noNaN: true }), {
            minLength: 1,
            maxLength: 10,
          }),
          (a: number[]) => {
            const similarity = computeCosineSimilarity(a, a);
            return Math.abs(similarity - 1) < 1e-10;
          }
        )
      );
    });

    test("returns value in range [-1, 1]", () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: -1, max: 1, noNaN: true }), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.array(fc.float({ min: -1, max: 1, noNaN: true }), {
            minLength: 1,
            maxLength: 10,
          }),
          (a: number[], b: number[]) => {
            if (a.length !== b.length) {
              return true;
            }
            const similarity = computeCosineSimilarity(a, b);
            return (
              (similarity >= -1 && similarity <= 1) || Number.isNaN(similarity)
            );
          }
        )
      );
    });

    test("scale invariance: similarity(a, b) === similarity(k*a, b) for k > 0", () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 0.1, max: 1, noNaN: true }), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.array(fc.double({ min: 0.1, max: 1, noNaN: true }), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.double({ min: 0.1, max: 10, noNaN: true }),
          (a: number[], b: number[], k: number) => {
            if (a.length !== b.length) {
              return true;
            }
            const scaledA = a.map((x: number) => x * k);
            const sim1 = computeCosineSimilarity(a, b);
            const sim2 = computeCosineSimilarity(scaledA, b);
            return Math.abs(sim1 - sim2) < 1e-6;
          }
        )
      );
    });
  });
});

describe("SemanticCache", () => {
  let cache: SemanticCache;

  beforeEach(() => {
    resetSemanticCache();
    cache = new SemanticCache();
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.mGet.mockReset();
    mockRedisClient.sMembers.mockReset();
    mockRedisClient.sAdd.mockReset();
    mockRedisClient.sRem.mockReset();
    mockRedisClient.sCard.mockReset();
    mockRedisClient.del.mockReset();
  });

  afterEach(() => {
    resetSemanticCache();
  });

  describe("singleton pattern", () => {
    test("getSemanticCache returns same instance", () => {
      const instance1 = getSemanticCache();
      const instance2 = getSemanticCache();
      expect(instance1).toBe(instance2);
    });

    test("resetSemanticCache creates new instance", () => {
      const instance1 = getSemanticCache();
      resetSemanticCache();
      const instance2 = getSemanticCache();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("findSimilar", () => {
    test("returns null when no entries exist", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve([] as string[])
      );

      const result = await cache.findSimilar("team-1", [0.1, 0.2, 0.3]);
      expect(result).toBeNull();
    });

    test("finds similar entries above threshold", async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4];
      const entry = {
        queryEmbedding: embedding,
        queryText: "test query",
        response: {
          answer: "test answer",
          citations: [],
          groundingScore: 0.9,
          confidence: null,
          generatedAt: Date.now(),
        },
        hitCount: 0,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve(["entry-1"] as string[])
      );
      mockRedisClient.mGet.mockImplementation(() =>
        Promise.resolve([JSON.stringify(entry)] as (string | null)[])
      );
      mockRedisClient.set.mockImplementation(() => Promise.resolve("OK"));

      const result = await cache.findSimilar("team-1", embedding);
      expect(result).not.toBeNull();
      expect(result?.similarity).toBeCloseTo(1, 5);
    });

    test("does not return entries below threshold", async () => {
      const embedding1 = [1, 0, 0, 0];
      const embedding2 = [0, 1, 0, 0];

      const entry = {
        queryEmbedding: embedding1,
        queryText: "test query",
        response: {
          answer: "test answer",
          citations: [],
          groundingScore: 0.9,
          confidence: null,
          generatedAt: Date.now(),
        },
        hitCount: 0,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve(["entry-1"] as string[])
      );
      mockRedisClient.mGet.mockImplementation(() =>
        Promise.resolve([JSON.stringify(entry)] as (string | null)[])
      );

      const result = await cache.findSimilar("team-1", embedding2, 0.85);
      expect(result).toBeNull();
    });

    test("returns null on Redis error", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.reject(new Error("Redis connection failed"))
      );

      const result = await cache.findSimilar("team-1", [0.1, 0.2, 0.3]);
      expect(result).toBeNull();
    });
  });

  describe("store", () => {
    test("stores entry in Redis", async () => {
      mockRedisClient.sAdd.mockImplementation(() => Promise.resolve(1));
      mockRedisClient.set.mockImplementation(() => Promise.resolve("OK"));
      mockRedisClient.sCard.mockImplementation(() => Promise.resolve(1));

      await cache.store("team-1", "test query", [0.1, 0.2, 0.3], {
        answer: "test answer",
        citations: [],
        groundingScore: 0.9,
        confidence: null,
        generatedAt: Date.now(),
      });

      expect(mockRedisClient.sAdd).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    test("does not throw on Redis error", async () => {
      mockRedisClient.sAdd.mockImplementation(() =>
        Promise.reject(new Error("Redis connection failed"))
      );

      await expect(
        cache.store("team-1", "test query", [0.1, 0.2, 0.3], {
          answer: "test answer",
          citations: [],
          groundingScore: 0.9,
          confidence: null,
          generatedAt: Date.now(),
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("invalidateTeam", () => {
    test("deletes all team entries", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve(["entry-1", "entry-2"] as string[])
      );
      mockRedisClient.del.mockImplementation(() => Promise.resolve(3));

      await cache.invalidateTeam("team-1");

      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    test("handles empty team gracefully", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve([] as string[])
      );

      await expect(cache.invalidateTeam("team-1")).resolves.toBeUndefined();
    });
  });

  describe("getStats", () => {
    test("returns zeros for empty cache", async () => {
      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve([] as string[])
      );

      const stats = await cache.getStats("team-1");
      expect(stats).toEqual({
        entryCount: 0,
        totalHits: 0,
        avgHitsPerEntry: 0,
      });
    });

    test("calculates stats correctly", async () => {
      const entry1 = {
        queryEmbedding: [0.1, 0.2],
        queryText: "query 1",
        response: {
          answer: "answer 1",
          citations: [],
          groundingScore: 0.9,
          confidence: null,
          generatedAt: Date.now(),
        },
        hitCount: 5,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      const entry2 = {
        queryEmbedding: [0.3, 0.4],
        queryText: "query 2",
        response: {
          answer: "answer 2",
          citations: [],
          groundingScore: 0.8,
          confidence: null,
          generatedAt: Date.now(),
        },
        hitCount: 3,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      mockRedisClient.sMembers.mockImplementation(() =>
        Promise.resolve(["entry-1", "entry-2"] as string[])
      );
      mockRedisClient.mGet.mockImplementation(() =>
        Promise.resolve([JSON.stringify(entry1), JSON.stringify(entry2)] as (
          | string
          | null
        )[])
      );

      const stats = await cache.getStats("team-1");
      expect(stats.entryCount).toBe(2);
      expect(stats.totalHits).toBe(8);
      expect(stats.avgHitsPerEntry).toBe(4);
    });
  });
});
