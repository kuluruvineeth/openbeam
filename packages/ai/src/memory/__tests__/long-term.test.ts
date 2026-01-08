import { beforeEach, describe, expect, it } from "bun:test";
import {
  createLongTermMemory,
  InMemoryVectorStore,
  type LongTermMemory,
  MockEmbeddingProvider,
} from "../long-term";

const LTM_ID_PATTERN = /^ltm_test-team_\d+_\d+$/;

describe("LongTermMemoryStore", () => {
  let memory: LongTermMemory;
  let vectorStore: InMemoryVectorStore;

  beforeEach(() => {
    vectorStore = new InMemoryVectorStore();
    memory = createLongTermMemory({
      embeddingProvider: new MockEmbeddingProvider(128),
      vectorStore,
      teamId: "test-team",
    });
  });

  describe("store", () => {
    it("stores content and returns an id", async () => {
      const id = await memory.store("Important information about the project");

      expect(id).toMatch(LTM_ID_PATTERN);
    });

    it("stores content with metadata", async () => {
      const id = await memory.store("User prefers dark mode", {
        category: "preference",
        source: "conversation",
      });

      const entry = await memory.get(id);

      expect(entry?.metadata.category).toBe("preference");
      expect(entry?.metadata.source).toBe("conversation");
    });

    it("includes team id in metadata", async () => {
      const id = await memory.store("Team context");

      const entry = await memory.get(id);

      expect(entry?.metadata.teamId).toBe("test-team");
    });
  });

  describe("search", () => {
    it("finds semantically similar content", async () => {
      await memory.store("The cat sat on the mat");
      await memory.store("Dogs are great companions");
      await memory.store("A feline rested on the rug");

      const results = await memory.search("cat on a mat", 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.relevanceScore).toBeGreaterThan(0);
    });

    it("respects limit parameter", async () => {
      await memory.store("Entry 1");
      await memory.store("Entry 2");
      await memory.store("Entry 3");
      await memory.store("Entry 4");
      await memory.store("Entry 5");

      const results = await memory.search("entry", 2);

      expect(results.length).toBe(2);
    });

    it("returns entries sorted by relevance", async () => {
      await memory.store("Completely unrelated topic about weather");
      await memory.store("JavaScript programming language");
      await memory.store("TypeScript is a typed superset of JavaScript");

      const results = await memory.search("TypeScript programming", 3);

      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        if (prev && curr) {
          expect(prev.relevanceScore).toBeGreaterThanOrEqual(
            curr.relevanceScore
          );
        }
      }
    });

    it("returns empty array when no memories exist", async () => {
      const results = await memory.search("anything");

      expect(results).toEqual([]);
    });
  });

  describe("get", () => {
    it("retrieves stored entry by id", async () => {
      const id = await memory.store("Test content");

      const entry = await memory.get(id);

      expect(entry).not.toBeNull();
      expect(entry?.content).toBe("Test content");
      expect(entry?.id).toBe(id);
    });

    it("returns null for non-existent id", async () => {
      const entry = await memory.get("nonexistent");

      expect(entry).toBeNull();
    });

    it("includes createdAt timestamp", async () => {
      const before = Date.now();
      const id = await memory.store("Timestamped content");
      const after = Date.now();

      const entry = await memory.get(id);

      expect(entry?.createdAt).toBeGreaterThanOrEqual(before);
      expect(entry?.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe("delete", () => {
    it("removes entry from store", async () => {
      const id = await memory.store("To be deleted");

      await memory.delete(id);

      const entry = await memory.get(id);
      expect(entry).toBeNull();
    });

    it("removes entry from search results", async () => {
      const id = await memory.store("Unique searchable content xyz");

      await memory.delete(id);

      const results = await memory.search("xyz", 10);
      const found = results.find((r) => r.entry.id === id);
      expect(found).toBeUndefined();
    });
  });
});

describe("InMemoryVectorStore", () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  it("filters by metadata", async () => {
    await store.insert("1", [1, 0, 0], { teamId: "team-a" });
    await store.insert("2", [0.9, 0.1, 0], { teamId: "team-b" });
    await store.insert("3", [0.8, 0.2, 0], { teamId: "team-a" });

    const results = await store.search([1, 0, 0], 10, { teamId: "team-a" });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.metadata.teamId === "team-a")).toBe(true);
  });

  it("calculates cosine similarity correctly", async () => {
    await store.insert("same", [1, 0, 0], {});
    await store.insert("perpendicular", [0, 1, 0], {});
    await store.insert("opposite", [-1, 0, 0], {});

    const results = await store.search([1, 0, 0], 3);

    expect(results[0]?.id).toBe("same");
    expect(results[0]?.score).toBeCloseTo(1.0, 5);
    expect(results.find((r) => r.id === "perpendicular")?.score).toBeCloseTo(
      0,
      5
    );
    expect(results.find((r) => r.id === "opposite")?.score).toBeCloseTo(-1, 5);
  });

  it("clears all entries", async () => {
    await store.insert("1", [1, 0], {});
    await store.insert("2", [0, 1], {});

    store.clear();

    const results = await store.search([1, 0], 10);
    expect(results).toHaveLength(0);
  });
});

describe("MockEmbeddingProvider", () => {
  it("produces vectors of specified dimension", async () => {
    const provider = new MockEmbeddingProvider(256);

    const embedding = await provider.embed("test text");

    expect(embedding).toHaveLength(256);
  });

  it("produces normalized vectors", async () => {
    const provider = new MockEmbeddingProvider(128);

    const embedding = await provider.embed("test text");

    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 5);
  });

  it("produces consistent embeddings for same text", async () => {
    const provider = new MockEmbeddingProvider(64);

    const embedding1 = await provider.embed("hello world");
    const embedding2 = await provider.embed("hello world");

    expect(embedding1).toEqual(embedding2);
  });

  it("produces different embeddings for different text", async () => {
    const provider = new MockEmbeddingProvider(64);

    const embedding1 = await provider.embed("hello");
    const embedding2 = await provider.embed("goodbye");

    expect(embedding1).not.toEqual(embedding2);
  });
});
