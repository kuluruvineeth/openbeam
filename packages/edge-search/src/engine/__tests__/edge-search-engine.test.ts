import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, it } from "bun:test";
import type { EdgeDocumentRecord } from "@openbeam/types/edge/search";
import { SQLiteFTS5Provider } from "../../fts5/provider";
import { SQLiteDocumentStore } from "../../store/sqlite-document-store";
import { InMemoryVectorProvider } from "../../vector/memory-provider";
import { EdgeSearchEngine } from "../edge-search-engine";

function makeDoc(
  overrides: Partial<EdgeDocumentRecord> = {}
): EdgeDocumentRecord {
  return {
    documentId: "doc-1",
    connectorId: "conn-1",
    title: "Test Document",
    content:
      "This is the content of the test document about TypeScript and testing.",
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
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

describe("EdgeSearchEngine", () => {
  let db: Database;
  let fts: SQLiteFTS5Provider;
  let vector: InMemoryVectorProvider;
  let store: SQLiteDocumentStore;
  let engine: EdgeSearchEngine;

  beforeEach(() => {
    db = new Database(":memory:");
    fts = new SQLiteFTS5Provider(db);
    vector = new InMemoryVectorProvider();
    store = new SQLiteDocumentStore(db);
    engine = new EdgeSearchEngine({ fts, vector, store });
  });

  describe("indexDocument", () => {
    it("indexes in all stores", async () => {
      const doc = makeDoc({ embedding: normalized(1, 0, 0) });
      await engine.indexDocument(doc);

      const stats = await engine.stats();
      expect(stats.ftsDocuments).toBe(1);
      expect(stats.vectorDocuments).toBe(1);
      expect(stats.storeDocuments).toBe(1);
    });

    it("indexes without embedding (no vector)", async () => {
      await engine.indexDocument(makeDoc());
      const stats = await engine.stats();
      expect(stats.ftsDocuments).toBe(1);
      expect(stats.vectorDocuments).toBe(0);
      expect(stats.storeDocuments).toBe(1);
    });

    it("indexes multiple documents", async () => {
      await engine.indexDocument(makeDoc({ documentId: "d1", title: "First" }));
      await engine.indexDocument(
        makeDoc({ documentId: "d2", title: "Second" })
      );
      const stats = await engine.stats();
      expect(stats.storeDocuments).toBe(2);
      expect(stats.ftsDocuments).toBe(2);
    });
  });

  describe("removeDocument", () => {
    it("removes from all stores", async () => {
      const doc = makeDoc({ embedding: normalized(1, 0, 0) });
      await engine.indexDocument(doc);
      await engine.removeDocument("doc-1");

      const stats = await engine.stats();
      expect(stats.ftsDocuments).toBe(0);
      expect(stats.vectorDocuments).toBe(0);
      expect(stats.storeDocuments).toBe(0);
    });

    it("does not error on non-existent document", async () => {
      await engine.removeDocument("nonexistent");
    });
  });

  describe("search - FTS only mode", () => {
    beforeEach(async () => {
      await engine.indexDocument(
        makeDoc({
          documentId: "d1",
          connectorId: "c1",
          title: "TypeScript Guide",
          content: "Learn TypeScript for web development",
        })
      );
      await engine.indexDocument(
        makeDoc({
          documentId: "d2",
          connectorId: "c1",
          title: "Bun Runtime",
          content: "Bun is a fast JavaScript runtime",
        })
      );
      await engine.indexDocument(
        makeDoc({
          documentId: "d3",
          connectorId: "c2",
          title: "Python Tutorial",
          content: "Getting started with Python programming",
        })
      );
    });

    it("returns matching results", async () => {
      const response = await engine.search({ query: "TypeScript", limit: 10 });
      expect(response.results.length).toBeGreaterThanOrEqual(1);
      expect(response.searchMode).toBe("fts_only");
    });

    it("includes timing information", async () => {
      const response = await engine.search({ query: "TypeScript", limit: 10 });
      expect(response.queryTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("populates result fields from store", async () => {
      const response = await engine.search({ query: "TypeScript", limit: 10 });
      const result = response.results[0];
      expect(result.title).toBeDefined();
      expect(result.snippet).toBeDefined();
      expect(result.connectorId).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });

    it("generates snippets from content", async () => {
      const response = await engine.search({ query: "TypeScript", limit: 10 });
      const result = response.results.find((r) => r.documentId === "d1");
      expect(result?.snippet.length).toBeLessThanOrEqual(200);
    });

    it("respects limit", async () => {
      const response = await engine.search({
        query: "TypeScript OR Bun OR Python",
        limit: 1,
      });
      expect(response.results.length).toBeLessThanOrEqual(1);
    });

    it("returns empty for no matches", async () => {
      const response = await engine.search({ query: "nonexistent", limit: 10 });
      expect(response.results).toEqual([]);
      expect(response.totalHits).toBe(0);
    });

    it("filters by connectorIds", async () => {
      const response = await engine.search({
        query: "TypeScript OR Python",
        limit: 10,
        connectorIds: ["c1"],
      });
      for (const r of response.results) {
        expect(r.connectorId).toBe("c1");
      }
    });

    it("filters by documentTypes", async () => {
      await engine.indexDocument(
        makeDoc({
          documentId: "d4",
          title: "Article",
          content: "TypeScript article",
          documentType: "article",
        })
      );
      await engine.indexDocument(
        makeDoc({
          documentId: "d5",
          title: "Page",
          content: "TypeScript page",
          documentType: "page",
        })
      );
      const response = await engine.search({
        query: "TypeScript",
        limit: 10,
        documentTypes: ["article"],
      });
      for (const r of response.results) {
        if (r.documentType) {
          expect(r.documentType).toBe("article");
        }
      }
    });
  });

  describe("search - hybrid mode", () => {
    beforeEach(async () => {
      await engine.indexDocument(
        makeDoc({
          documentId: "d1",
          title: "TypeScript Guide",
          content: "Learn TypeScript for web development",
          embedding: normalized(1, 0, 0),
        })
      );
      await engine.indexDocument(
        makeDoc({
          documentId: "d2",
          title: "JavaScript Basics",
          content: "JavaScript is a programming language",
          embedding: normalized(0.9, 0.1, 0),
        })
      );
      await engine.indexDocument(
        makeDoc({
          documentId: "d3",
          title: "Python Tutorial",
          content: "Python for data science",
          embedding: normalized(0, 0, 1),
        })
      );
    });

    it("uses hybrid mode when embedding is provided", async () => {
      const response = await engine.search(
        { query: "TypeScript", limit: 10 },
        normalized(1, 0, 0)
      );
      expect(response.searchMode).toBe("hybrid");
    });

    it("returns results with both FTS and vector scores", async () => {
      const response = await engine.search(
        { query: "TypeScript", limit: 10 },
        normalized(1, 0, 0)
      );
      expect(response.results.length).toBeGreaterThanOrEqual(1);
    });

    it("falls back to FTS when no embedding provided", async () => {
      const response = await engine.search({ query: "TypeScript", limit: 10 });
      expect(response.searchMode).toBe("fts_only");
    });

    it("uses custom hybridAlpha", async () => {
      const ftsOnly = await engine.search(
        { query: "TypeScript", limit: 10, hybridAlpha: 0 },
        normalized(1, 0, 0)
      );
      const vectorOnly = await engine.search(
        { query: "TypeScript", limit: 10, hybridAlpha: 1 },
        normalized(1, 0, 0)
      );
      expect(ftsOnly.searchMode).toBe("hybrid");
      expect(vectorOnly.searchMode).toBe("hybrid");
    });
  });

  describe("search - FTS only engine (no vector provider)", () => {
    it("uses FTS only when no vector provider configured", async () => {
      const ftsOnlyEngine = new EdgeSearchEngine({ fts, store });
      await ftsOnlyEngine.indexDocument(
        makeDoc({ documentId: "d1", title: "Test", content: "Test content" })
      );
      const response = await ftsOnlyEngine.search(
        { query: "Test", limit: 10 },
        normalized(1, 0, 0)
      );
      expect(response.searchMode).toBe("fts_only");
    });
  });

  describe("stats", () => {
    it("returns zero counts for empty engine", async () => {
      const stats = await engine.stats();
      expect(stats.ftsDocuments).toBe(0);
      expect(stats.vectorDocuments).toBe(0);
      expect(stats.storeDocuments).toBe(0);
    });

    it("returns accurate counts", async () => {
      await engine.indexDocument(
        makeDoc({ documentId: "d1", embedding: normalized(1, 0, 0) })
      );
      await engine.indexDocument(makeDoc({ documentId: "d2" }));

      const stats = await engine.stats();
      expect(stats.ftsDocuments).toBe(2);
      expect(stats.vectorDocuments).toBe(1);
      expect(stats.storeDocuments).toBe(2);
    });

    it("returns 0 for vector when no vector provider", async () => {
      const ftsOnlyEngine = new EdgeSearchEngine({ fts, store });
      await ftsOnlyEngine.indexDocument(makeDoc());
      const stats = await ftsOnlyEngine.stats();
      expect(stats.vectorDocuments).toBe(0);
    });
  });
});
