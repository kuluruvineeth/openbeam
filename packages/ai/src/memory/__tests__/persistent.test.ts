import { beforeEach, describe, expect, it } from "bun:test";
import { InMemoryVectorStore, MockEmbeddingProvider } from "../long-term";
import {
  createPersistentMemory,
  type PersistentMemory,
  PersistentMemoryStoreImpl,
} from "../persistent";

describe("PersistentMemoryStoreImpl", () => {
  let embeddingProvider: MockEmbeddingProvider;
  let vectorStore: InMemoryVectorStore;
  let memory: PersistentMemory;

  beforeEach(() => {
    embeddingProvider = new MockEmbeddingProvider();
    vectorStore = new InMemoryVectorStore();
    memory = new PersistentMemoryStoreImpl({
      embeddingProvider,
      vectorStore,
      teamId: "team-1",
    });
  });

  describe("store", () => {
    it("stores a memory entry and returns an id", async () => {
      const id = await memory.store({
        content: "The user prefers TypeScript over JavaScript",
      });

      expect(id).toBeDefined();
      expect(id).toContain("pm_team-1_");
    });

    it("stores with tags and importance", async () => {
      const id = await memory.store({
        content: "API key rotation happens quarterly",
        tags: ["security", "operations"],
        importance: "high",
      });

      const entry = await memory.get(id);
      expect(entry).not.toBeNull();
      expect(entry?.tags).toEqual(["security", "operations"]);
      expect(entry?.importance).toBe("high");
    });

    it("defaults importance to medium", async () => {
      const id = await memory.store({
        content: "Some fact",
      });

      const entry = await memory.get(id);
      expect(entry?.importance).toBe("medium");
    });

    it("defaults source to agent", async () => {
      const id = await memory.store({
        content: "Some fact",
      });

      const entry = await memory.get(id);
      expect(entry?.source).toBe("agent");
    });

    it("generates unique IDs for each entry", async () => {
      const id1 = await memory.store({ content: "First" });
      const id2 = await memory.store({ content: "Second" });

      expect(id1).not.toBe(id2);
    });
  });

  describe("recall", () => {
    it("finds relevant entries by semantic search", async () => {
      await memory.store({ content: "The database uses PostgreSQL" });
      await memory.store({ content: "The frontend uses React" });
      await memory.store({ content: "Redis is used for caching" });

      const results = await memory.recall({
        query: "database technology",
        teamId: "team-1",
        limit: 5,
        minRelevance: 0,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        await memory.store({ content: `Fact number ${i} about databases` });
      }

      const results = await memory.recall({
        query: "databases",
        teamId: "team-1",
        limit: 3,
        minRelevance: 0,
      });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("filters by tags", async () => {
      await memory.store({
        content: "PostgreSQL for main DB",
        tags: ["database"],
      });
      await memory.store({
        content: "React for frontend",
        tags: ["frontend"],
      });

      const results = await memory.recall({
        query: "technology",
        teamId: "team-1",
        tags: ["database"],
        limit: 10,
        minRelevance: 0,
      });

      for (const result of results) {
        expect(result.entry.tags).toContain("database");
      }
    });

    it("returns match type information", async () => {
      await memory.store({ content: "PostgreSQL database information" });

      const results = await memory.recall({
        query: "PostgreSQL database",
        teamId: "team-1",
        limit: 5,
        minRelevance: 0,
      });

      if (results.length > 0) {
        const [first] = results;
        expect(first).toBeDefined();
        if (!first) {
          return;
        }
        expect(["semantic", "keyword", "hybrid"]).toContain(first.matchType);
      }
    });

    it("returns relevance scores", async () => {
      await memory.store({ content: "Important fact" });

      const results = await memory.recall({
        query: "Important fact",
        teamId: "team-1",
        limit: 5,
        minRelevance: 0,
      });

      if (results.length > 0) {
        const [first] = results;
        expect(first).toBeDefined();
        if (!first) {
          return;
        }
        expect(first.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(first.relevanceScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("update", () => {
    it("updates content of an existing entry", async () => {
      const id = await memory.store({ content: "Original content" });

      const updated = await memory.update(id, { content: "Updated content" });

      expect(updated).toBe(true);
      const entry = await memory.get(id);
      expect(entry?.content).toBe("Updated content");
    });

    it("updates tags of an existing entry", async () => {
      const id = await memory.store({
        content: "Some content",
        tags: ["old-tag"],
      });

      await memory.update(id, { tags: ["new-tag-1", "new-tag-2"] });

      const entry = await memory.get(id);
      expect(entry?.tags).toEqual(["new-tag-1", "new-tag-2"]);
    });

    it("updates importance level", async () => {
      const id = await memory.store({
        content: "Some content",
        importance: "low",
      });

      await memory.update(id, { importance: "high" });

      const entry = await memory.get(id);
      expect(entry?.importance).toBe("high");
    });

    it("returns false for non-existent entry", async () => {
      const updated = await memory.update("nonexistent", {
        content: "New content",
      });

      expect(updated).toBe(false);
    });

    it("returns false for entry from different team", async () => {
      const otherTeamMemory = new PersistentMemoryStoreImpl({
        embeddingProvider,
        vectorStore,
        teamId: "team-2",
      });

      const id = await otherTeamMemory.store({ content: "Other team data" });

      const updated = await memory.update(id, { content: "Hijacked" });
      expect(updated).toBe(false);
    });
  });

  describe("forget", () => {
    it("deletes an existing entry", async () => {
      const id = await memory.store({ content: "Forget me" });

      const deleted = await memory.forget(id);

      expect(deleted).toBe(true);
      const entry = await memory.get(id);
      expect(entry).toBeNull();
    });

    it("returns false for non-existent entry", async () => {
      const deleted = await memory.forget("nonexistent");

      expect(deleted).toBe(false);
    });

    it("returns false for entry from different team", async () => {
      const otherTeamMemory = new PersistentMemoryStoreImpl({
        embeddingProvider,
        vectorStore,
        teamId: "team-2",
      });

      const id = await otherTeamMemory.store({ content: "Other team data" });

      const deleted = await memory.forget(id);
      expect(deleted).toBe(false);
    });
  });

  describe("forgetByQuery", () => {
    it("deletes entries matching a query", async () => {
      await memory.store({ content: "Database migration v1" });
      await memory.store({ content: "Database migration v2" });
      await memory.store({ content: "Frontend styling" });

      const deletedCount = await memory.forgetByQuery({
        query: "database migration",
        limit: 10,
      });

      expect(deletedCount).toBeGreaterThan(0);
    });

    it("deletes entries matching tags", async () => {
      await memory.store({ content: "Fact 1", tags: ["temp"] });
      await memory.store({ content: "Fact 2", tags: ["temp"] });
      await memory.store({ content: "Fact 3", tags: ["permanent"] });

      const deletedCount = await memory.forgetByQuery({
        tags: ["temp"],
        limit: 10,
      });

      expect(deletedCount).toBe(2);
    });
  });

  describe("get", () => {
    it("retrieves a stored entry by id", async () => {
      const id = await memory.store({
        content: "Test content",
        tags: ["test"],
        source: "user",
        importance: "high",
      });

      const entry = await memory.get(id);

      expect(entry).not.toBeNull();
      expect(entry?.id).toBe(id);
      expect(entry?.content).toBe("Test content");
      expect(entry?.tags).toEqual(["test"]);
      expect(entry?.source).toBe("user");
      expect(entry?.importance).toBe("high");
      expect(entry?.teamId).toBe("team-1");
      expect(entry?.createdAt).toBeGreaterThan(0);
    });

    it("returns null for non-existent id", async () => {
      const entry = await memory.get("nonexistent");
      expect(entry).toBeNull();
    });

    it("returns null for entry from different team", async () => {
      const otherTeamMemory = new PersistentMemoryStoreImpl({
        embeddingProvider,
        vectorStore,
        teamId: "team-2",
      });

      const id = await otherTeamMemory.store({ content: "Other team" });

      const entry = await memory.get(id);
      expect(entry).toBeNull();
    });
  });

  describe("list", () => {
    it("lists all entries for the team", async () => {
      await memory.store({ content: "Entry 1" });
      await memory.store({ content: "Entry 2" });
      await memory.store({ content: "Entry 3" });

      const entries = await memory.list();

      expect(entries.length).toBe(3);
    });

    it("filters by tags", async () => {
      await memory.store({ content: "Tagged", tags: ["important"] });
      await memory.store({ content: "Untagged" });

      const entries = await memory.list({ tags: ["important"] });

      expect(entries.length).toBe(1);
      expect(entries[0]?.content).toBe("Tagged");
    });

    it("respects limit", async () => {
      for (let i = 0; i < 5; i++) {
        await memory.store({ content: `Entry ${i}` });
      }

      const entries = await memory.list({ limit: 2 });

      expect(entries.length).toBe(2);
    });

    it("supports offset", async () => {
      for (let i = 0; i < 5; i++) {
        await memory.store({ content: `Entry ${i}` });
      }

      const allEntries = await memory.list();
      const offsetEntries = await memory.list({ offset: 2 });

      expect(offsetEntries.length).toBe(allEntries.length - 2);
    });
  });

  describe("count", () => {
    it("returns 0 for empty store", async () => {
      const count = await memory.count();
      expect(count).toBe(0);
    });

    it("returns correct count", async () => {
      await memory.store({ content: "One" });
      await memory.store({ content: "Two" });
      await memory.store({ content: "Three" });

      const count = await memory.count();
      expect(count).toBe(3);
    });
  });

  describe("team isolation", () => {
    it("isolates data between teams", async () => {
      const teamAMemory = new PersistentMemoryStoreImpl({
        embeddingProvider,
        vectorStore,
        teamId: "team-a",
      });

      const teamBMemory = new PersistentMemoryStoreImpl({
        embeddingProvider,
        vectorStore,
        teamId: "team-b",
      });

      await teamAMemory.store({ content: "Team A secret" });
      await teamBMemory.store({ content: "Team B secret" });

      const countA = await teamAMemory.count();
      const countB = await teamBMemory.count();

      expect(countA).toBe(1);
      expect(countB).toBe(1);
    });
  });
});

describe("createPersistentMemory", () => {
  it("creates a persistent memory instance", () => {
    const memory = createPersistentMemory({
      embeddingProvider: new MockEmbeddingProvider(),
      vectorStore: new InMemoryVectorStore(),
      teamId: "team-1",
    });

    expect(memory).toBeInstanceOf(PersistentMemoryStoreImpl);
  });
});
