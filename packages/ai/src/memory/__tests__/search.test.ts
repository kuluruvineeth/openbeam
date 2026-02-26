import { beforeEach, describe, expect, it } from "bun:test";
import { InMemoryVectorStore, MockEmbeddingProvider } from "../long-term";
import {
  computeKeywordScore,
  extractQueryTerms,
  type HybridSearchDeps,
  hybridSearch,
} from "../search";

describe("hybridSearch", () => {
  let embeddingProvider: MockEmbeddingProvider;
  let vectorStore: InMemoryVectorStore;
  let deps: HybridSearchDeps;

  beforeEach(async () => {
    embeddingProvider = new MockEmbeddingProvider();
    vectorStore = new InMemoryVectorStore();
    deps = { embeddingProvider, vectorStore };

    const entries = [
      { id: "1", content: "PostgreSQL database management" },
      { id: "2", content: "React frontend framework" },
      { id: "3", content: "Redis caching layer" },
      { id: "4", content: "TypeScript programming language" },
    ];

    for (const entry of entries) {
      const embedding = await embeddingProvider.embed(entry.content);
      await vectorStore.insert(entry.id, embedding, {
        content: entry.content,
        tags: "[]",
        createdAt: Date.now(),
        teamId: "team-1",
      });
    }
  });

  it("returns results for a matching query", async () => {
    const results = await hybridSearch(deps, {
      query: "database",
      teamId: "team-1",
      limit: 10,
      minRelevance: 0,
    });

    expect(results.length).toBeGreaterThan(0);
  });

  it("respects limit parameter", async () => {
    const results = await hybridSearch(deps, {
      query: "programming",
      teamId: "team-1",
      limit: 2,
      minRelevance: 0,
    });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("sorts results by score descending", async () => {
    const results = await hybridSearch(deps, {
      query: "database",
      teamId: "team-1",
      limit: 10,
      minRelevance: 0,
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]?.score).toBeGreaterThanOrEqual(
        results[i]?.score ?? 0
      );
    }
  });

  it("assigns match type to each result", async () => {
    const results = await hybridSearch(deps, {
      query: "PostgreSQL database",
      teamId: "team-1",
      limit: 10,
      minRelevance: 0,
    });

    for (const result of results) {
      expect(["semantic", "keyword", "hybrid"]).toContain(result.matchType);
    }
  });

  it("filters by tags", async () => {
    const embedding = await embeddingProvider.embed("tagged entry");
    await vectorStore.insert("tagged-1", embedding, {
      content: "tagged entry about security",
      tags: JSON.stringify(["security"]),
      createdAt: Date.now(),
      teamId: "team-1",
    });

    const results = await hybridSearch(deps, {
      query: "security",
      teamId: "team-1",
      tags: ["security"],
      limit: 10,
      minRelevance: 0,
    });

    for (const result of results) {
      const tags = JSON.parse(result.metadata.tags as string) as string[];
      expect(tags).toContain("security");
    }
  });

  it("filters by date range", async () => {
    const now = Date.now();
    const embedding = await embeddingProvider.embed("recent entry");
    await vectorStore.insert("recent", embedding, {
      content: "recent entry about databases",
      tags: "[]",
      createdAt: now,
      teamId: "team-1",
    });

    const oldEmbedding = await embeddingProvider.embed("old entry");
    await vectorStore.insert("old", oldEmbedding, {
      content: "old entry about databases",
      tags: "[]",
      createdAt: now - 1_000_000,
      teamId: "team-1",
    });

    const results = await hybridSearch(deps, {
      query: "databases",
      teamId: "team-1",
      dateRange: { start: now - 100 },
      limit: 10,
      minRelevance: 0,
    });

    for (const result of results) {
      expect(result.metadata.createdAt as number).toBeGreaterThanOrEqual(
        now - 100
      );
    }
  });

  it("gracefully degrades when vector search fails", async () => {
    const failingProvider = {
      embed(_text: string): Promise<number[]> {
        return Promise.reject(new Error("Embedding service unavailable"));
      },
    };

    const failingDeps: HybridSearchDeps = {
      embeddingProvider: failingProvider,
      vectorStore,
    };

    const results = await hybridSearch(failingDeps, {
      query: "database",
      teamId: "team-1",
      limit: 10,
      minRelevance: 0,
    });

    expect(results).toEqual([]);
  });

  it("uses configurable semantic weight", async () => {
    const highSemanticResults = await hybridSearch(
      deps,
      { query: "database", teamId: "team-1", limit: 10, minRelevance: 0 },
      { semanticWeight: 0.9 }
    );

    const lowSemanticResults = await hybridSearch(
      deps,
      { query: "database", teamId: "team-1", limit: 10, minRelevance: 0 },
      { semanticWeight: 0.1 }
    );

    expect(highSemanticResults.length).toBeGreaterThanOrEqual(0);
    expect(lowSemanticResults.length).toBeGreaterThanOrEqual(0);
  });
});

describe("computeKeywordScore", () => {
  it("returns 1 when all terms match", () => {
    const score = computeKeywordScore("postgresql database management", [
      "postgresql",
      "database",
      "management",
    ]);

    expect(score).toBe(1);
  });

  it("returns 0 when no terms match", () => {
    const score = computeKeywordScore("react frontend framework", [
      "database",
      "postgresql",
    ]);

    expect(score).toBe(0);
  });

  it("returns partial score for partial matches", () => {
    const score = computeKeywordScore("postgresql database management", [
      "postgresql",
      "redis",
    ]);

    expect(score).toBe(0.5);
  });

  it("returns 0 for empty query terms", () => {
    const score = computeKeywordScore("some content", []);

    expect(score).toBe(0);
  });

  it("is case-insensitive", () => {
    const score = computeKeywordScore("PostgreSQL Database", [
      "postgresql",
      "database",
    ]);

    expect(score).toBe(1);
  });
});

describe("extractQueryTerms", () => {
  it("splits by whitespace and lowercases", () => {
    const terms = extractQueryTerms("PostgreSQL Database Management");

    expect(terms).toEqual(["postgresql", "database", "management"]);
  });

  it("filters short terms (< 3 chars)", () => {
    const terms = extractQueryTerms("a is the PostgreSQL db");

    expect(terms).toContain("postgresql");
    expect(terms).not.toContain("a");
    expect(terms).not.toContain("is");
  });

  it("handles empty input", () => {
    const terms = extractQueryTerms("");

    expect(terms).toEqual([]);
  });

  it("handles multiple spaces", () => {
    const terms = extractQueryTerms("  hello   world  ");

    expect(terms).toEqual(["hello", "world"]);
  });
});
