import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, it } from "bun:test";
import { SQLiteFTS5Provider } from "../provider";

describe("SQLiteFTS5Provider", () => {
  let db: Database;
  let provider: SQLiteFTS5Provider;

  beforeEach(() => {
    db = new Database(":memory:");
    provider = new SQLiteFTS5Provider(db);
  });

  describe("index", () => {
    it("indexes a document", async () => {
      await provider.index("doc1", "Test Title", "Test content body");
      const count = await provider.documentCount();
      expect(count).toBe(1);
    });

    it("replaces existing document on re-index", async () => {
      await provider.index("doc1", "Original", "Original content");
      await provider.index("doc1", "Updated", "Updated content");
      const count = await provider.documentCount();
      expect(count).toBe(1);
      const results = await provider.search("Updated", 10);
      expect(results.length).toBe(1);
    });

    it("indexes multiple documents", async () => {
      await provider.index("doc1", "Alpha", "First document");
      await provider.index("doc2", "Beta", "Second document");
      await provider.index("doc3", "Gamma", "Third document");
      const count = await provider.documentCount();
      expect(count).toBe(3);
    });

    it("handles empty title", async () => {
      await provider.index("doc1", "", "Content only");
      const count = await provider.documentCount();
      expect(count).toBe(1);
    });

    it("handles empty content", async () => {
      await provider.index("doc1", "Title only", "");
      const count = await provider.documentCount();
      expect(count).toBe(1);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await provider.index(
        "doc1",
        "Getting Started Guide",
        "How to set up the project with TypeScript and Bun runtime"
      );
      await provider.index(
        "doc2",
        "API Reference",
        "Complete API documentation for REST endpoints and authentication"
      );
      await provider.index(
        "doc3",
        "TypeScript Tips",
        "Advanced TypeScript patterns for type safety and performance"
      );
    });

    it("finds matching documents", async () => {
      const results = await provider.search("TypeScript", 10);
      expect(results.length).toBeGreaterThanOrEqual(1);
      const ids = results.map((r) => r.documentId);
      expect(ids).toContain("doc1");
      expect(ids).toContain("doc3");
    });

    it("returns positive BM25 scores", async () => {
      const results = await provider.search("TypeScript", 10);
      for (const r of results) {
        expect(r.score).toBeGreaterThan(0);
      }
    });

    it("sorts by score descending", async () => {
      const results = await provider.search("TypeScript", 10);
      for (let i = 1; i < results.length; i += 1) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it("respects limit parameter", async () => {
      const results = await provider.search("TypeScript", 1);
      expect(results.length).toBe(1);
    });

    it("returns empty for no matches", async () => {
      const results = await provider.search("nonexistent", 10);
      expect(results).toEqual([]);
    });

    it("returns empty for empty query", async () => {
      const results = await provider.search("", 10);
      expect(results).toEqual([]);
    });

    it("returns empty for whitespace query", async () => {
      const results = await provider.search("   ", 10);
      expect(results).toEqual([]);
    });

    it("handles query with quotes", async () => {
      const results = await provider.search("it's a test", 10);
      expect(Array.isArray(results)).toBe(true);
    });

    it("searches across title and content", async () => {
      const results = await provider.search("Guide", 10);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].documentId).toBe("doc1");
    });

    it("ranks more relevant documents higher", async () => {
      const results = await provider.search("API documentation", 10);
      expect(results[0].documentId).toBe("doc2");
    });
  });

  describe("remove", () => {
    it("removes an indexed document", async () => {
      await provider.index("doc1", "Test", "Content");
      await provider.remove("doc1");
      const count = await provider.documentCount();
      expect(count).toBe(0);
    });

    it("does not error when removing non-existent document", async () => {
      await provider.remove("nonexistent");
      const count = await provider.documentCount();
      expect(count).toBe(0);
    });

    it("only removes the specified document", async () => {
      await provider.index("doc1", "First", "Content A");
      await provider.index("doc2", "Second", "Content B");
      await provider.remove("doc1");
      const count = await provider.documentCount();
      expect(count).toBe(1);
      const results = await provider.search("Content", 10);
      expect(results[0].documentId).toBe("doc2");
    });
  });

  describe("clear", () => {
    it("removes all documents", async () => {
      await provider.index("doc1", "A", "Content");
      await provider.index("doc2", "B", "Content");
      await provider.clear();
      const count = await provider.documentCount();
      expect(count).toBe(0);
    });

    it("works on empty table", async () => {
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

    it("returns correct count after insertions", async () => {
      await provider.index("d1", "T1", "C1");
      await provider.index("d2", "T2", "C2");
      const count = await provider.documentCount();
      expect(count).toBe(2);
    });

    it("returns correct count after removal", async () => {
      await provider.index("d1", "T1", "C1");
      await provider.index("d2", "T2", "C2");
      await provider.remove("d1");
      const count = await provider.documentCount();
      expect(count).toBe(1);
    });
  });

  describe("custom table name", () => {
    it("uses custom table name", () => {
      const customDb = new Database(":memory:");
      const customProvider = new SQLiteFTS5Provider(customDb, "custom_fts");
      expect(customProvider).toBeDefined();
    });
  });
});
