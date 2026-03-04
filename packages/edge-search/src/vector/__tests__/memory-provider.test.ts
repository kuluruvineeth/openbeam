import { beforeEach, describe, expect, it } from "bun:test";
import { InMemoryVectorProvider } from "../memory-provider";

function vec(...values: number[]): Float32Array {
  return new Float32Array(values);
}

function normalized(...values: number[]): Float32Array {
  const v = new Float32Array(values);
  let norm = 0;
  for (const val of v) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  return v.map((val) => val / norm);
}

describe("InMemoryVectorProvider", () => {
  let provider: InMemoryVectorProvider;

  beforeEach(() => {
    provider = new InMemoryVectorProvider();
  });

  describe("upsert", () => {
    it("stores a vector", async () => {
      await provider.upsert("doc1", vec(1, 0, 0));
      const count = await provider.documentCount();
      expect(count).toBe(1);
    });

    it("overwrites existing vector", async () => {
      await provider.upsert("doc1", vec(1, 0, 0));
      await provider.upsert("doc1", vec(0, 1, 0));
      const count = await provider.documentCount();
      expect(count).toBe(1);
      const results = await provider.search(vec(0, 1, 0), 1);
      expect(results[0].documentId).toBe("doc1");
      expect(results[0].score).toBeCloseTo(1, 5);
    });

    it("stores independent copy of vector", async () => {
      const v = vec(1, 0, 0);
      await provider.upsert("doc1", v);
      v[0] = 0;
      const results = await provider.search(vec(1, 0, 0), 1);
      expect(results[0].score).toBeCloseTo(1, 5);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await provider.upsert("a", normalized(1, 0, 0));
      await provider.upsert("b", normalized(0, 1, 0));
      await provider.upsert("c", normalized(0, 0, 1));
      await provider.upsert("d", normalized(1, 1, 0));
    });

    it("returns the most similar vector", async () => {
      const results = await provider.search(normalized(1, 0, 0), 1);
      expect(results[0].documentId).toBe("a");
      expect(results[0].score).toBeCloseTo(1, 3);
    });

    it("returns top-k results", async () => {
      const results = await provider.search(normalized(1, 0.5, 0), 2);
      expect(results.length).toBe(2);
    });

    it("sorts by similarity descending", async () => {
      const results = await provider.search(normalized(1, 0.1, 0), 4);
      for (let i = 1; i < results.length; i += 1) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it("returns empty for empty store", async () => {
      const empty = new InMemoryVectorProvider();
      const results = await empty.search(vec(1, 0, 0), 10);
      expect(results).toEqual([]);
    });

    it("respects limit", async () => {
      const results = await provider.search(normalized(1, 1, 1), 2);
      expect(results.length).toBe(2);
    });

    it("handles orthogonal vectors", async () => {
      const results = await provider.search(normalized(1, 0, 0), 4);
      const bResult = results.find((r) => r.documentId === "b");
      const cResult = results.find((r) => r.documentId === "c");
      expect(bResult?.score).toBeCloseTo(0, 1);
      expect(cResult?.score).toBeCloseTo(0, 1);
    });

    it("skips vectors with mismatched dimensions", async () => {
      await provider.upsert("short", vec(1, 0));
      const results = await provider.search(normalized(1, 0, 0), 10);
      const ids = results.map((r) => r.documentId);
      expect(ids).not.toContain("short");
    });

    it("handles zero vector query gracefully", async () => {
      const results = await provider.search(vec(0, 0, 0), 10);
      for (const r of results) {
        expect(r.score).toBe(0);
      }
    });
  });

  describe("cosine similarity correctness", () => {
    it("identical vectors have similarity 1", async () => {
      await provider.upsert("doc", normalized(3, 4, 0));
      const results = await provider.search(normalized(3, 4, 0), 1);
      expect(results[0].score).toBeCloseTo(1, 5);
    });

    it("opposite vectors have similarity -1", async () => {
      await provider.upsert("doc", normalized(1, 0, 0));
      const results = await provider.search(normalized(-1, 0, 0), 1);
      expect(results[0].score).toBeCloseTo(-1, 5);
    });

    it("orthogonal vectors have similarity 0", async () => {
      await provider.upsert("doc", normalized(1, 0, 0));
      const results = await provider.search(normalized(0, 1, 0), 1);
      expect(results[0].score).toBeCloseTo(0, 5);
    });
  });

  describe("remove", () => {
    it("removes a vector", async () => {
      await provider.upsert("doc1", vec(1, 0, 0));
      await provider.remove("doc1");
      const count = await provider.documentCount();
      expect(count).toBe(0);
    });

    it("does not error on non-existent document", async () => {
      await provider.remove("nonexistent");
    });

    it("only removes specified document", async () => {
      await provider.upsert("a", vec(1, 0, 0));
      await provider.upsert("b", vec(0, 1, 0));
      await provider.remove("a");
      const count = await provider.documentCount();
      expect(count).toBe(1);
    });
  });

  describe("clear", () => {
    it("removes all vectors", async () => {
      await provider.upsert("a", vec(1, 0));
      await provider.upsert("b", vec(0, 1));
      await provider.clear();
      const count = await provider.documentCount();
      expect(count).toBe(0);
    });
  });

  describe("documentCount", () => {
    it("returns 0 for empty provider", async () => {
      const count = await provider.documentCount();
      expect(count).toBe(0);
    });

    it("tracks insertions", async () => {
      await provider.upsert("a", vec(1));
      await provider.upsert("b", vec(2));
      const count = await provider.documentCount();
      expect(count).toBe(2);
    });
  });
});
