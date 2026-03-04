import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, it } from "bun:test";
import type { EdgeDocumentRecord } from "@openplane/types/edge/search";
import { SQLiteDocumentStore } from "../sqlite-document-store";

function makeDoc(
  overrides: Partial<EdgeDocumentRecord> = {}
): EdgeDocumentRecord {
  return {
    documentId: "doc-1",
    connectorId: "conn-1",
    title: "Test Document",
    content: "This is the content of the test document.",
    documentType: "article",
    checksum: "abc123",
    metadata: { source: "test" },
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe("SQLiteDocumentStore", () => {
  let db: Database;
  let store: SQLiteDocumentStore;

  beforeEach(() => {
    db = new Database(":memory:");
    store = new SQLiteDocumentStore(db);
  });

  describe("put and get", () => {
    it("stores and retrieves a document", async () => {
      const doc = makeDoc();
      await store.put("doc-1", doc);
      const retrieved = await store.get("doc-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.documentId).toBe("doc-1");
      expect(retrieved?.title).toBe("Test Document");
      expect(retrieved?.content).toBe(
        "This is the content of the test document."
      );
      expect(retrieved?.connectorId).toBe("conn-1");
    });

    it("stores metadata as JSON", async () => {
      const doc = makeDoc({ metadata: { key: "value", nested: "data" } });
      await store.put("doc-1", doc);
      const retrieved = await store.get("doc-1");
      expect(retrieved?.metadata).toEqual({ key: "value", nested: "data" });
    });

    it("handles undefined metadata", async () => {
      const doc = makeDoc({ metadata: undefined });
      await store.put("doc-1", doc);
      const retrieved = await store.get("doc-1");
      expect(retrieved?.metadata).toBeUndefined();
    });

    it("handles undefined optional fields", async () => {
      const doc = makeDoc({ documentType: undefined, checksum: undefined });
      await store.put("doc-1", doc);
      const retrieved = await store.get("doc-1");
      expect(retrieved?.documentType).toBeUndefined();
      expect(retrieved?.checksum).toBeUndefined();
    });

    it("overwrites existing document", async () => {
      await store.put("doc-1", makeDoc({ title: "Original" }));
      await store.put("doc-1", makeDoc({ title: "Updated" }));
      const retrieved = await store.get("doc-1");
      expect(retrieved?.title).toBe("Updated");
      const count = await store.count();
      expect(count).toBe(1);
    });

    it("returns undefined for non-existent document", async () => {
      const result = await store.get("nonexistent");
      expect(result).toBeUndefined();
    });

    it("preserves timestamps", async () => {
      const doc = makeDoc({
        createdAt: 1_234_567_890,
        updatedAt: 9_876_543_210,
      });
      await store.put("doc-1", doc);
      const retrieved = await store.get("doc-1");
      expect(retrieved?.createdAt).toBe(1_234_567_890);
      expect(retrieved?.updatedAt).toBe(9_876_543_210);
    });
  });

  describe("delete", () => {
    it("deletes an existing document", async () => {
      await store.put("doc-1", makeDoc());
      await store.delete("doc-1");
      const result = await store.get("doc-1");
      expect(result).toBeUndefined();
    });

    it("does not error on non-existent document", async () => {
      await store.delete("nonexistent");
    });

    it("only deletes specified document", async () => {
      await store.put("doc-1", makeDoc({ documentId: "doc-1" }));
      await store.put("doc-2", makeDoc({ documentId: "doc-2" }));
      await store.delete("doc-1");
      const count = await store.count();
      expect(count).toBe(1);
      const remaining = await store.get("doc-2");
      expect(remaining).toBeDefined();
    });
  });

  describe("has", () => {
    it("returns true for existing document", async () => {
      await store.put("doc-1", makeDoc());
      const exists = await store.has("doc-1");
      expect(exists).toBe(true);
    });

    it("returns false for non-existent document", async () => {
      const exists = await store.has("nonexistent");
      expect(exists).toBe(false);
    });

    it("returns false after deletion", async () => {
      await store.put("doc-1", makeDoc());
      await store.delete("doc-1");
      const exists = await store.has("doc-1");
      expect(exists).toBe(false);
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await store.put(
        "d1",
        makeDoc({
          documentId: "d1",
          connectorId: "c1",
          documentType: "article",
          updatedAt: 3000,
        })
      );
      await store.put(
        "d2",
        makeDoc({
          documentId: "d2",
          connectorId: "c1",
          documentType: "page",
          updatedAt: 2000,
        })
      );
      await store.put(
        "d3",
        makeDoc({
          documentId: "d3",
          connectorId: "c2",
          documentType: "article",
          updatedAt: 1000,
        })
      );
    });

    it("returns all documents without filters", async () => {
      const docs = await store.list();
      expect(docs.length).toBe(3);
    });

    it("filters by connectorId", async () => {
      const docs = await store.list({ connectorId: "c1" });
      expect(docs.length).toBe(2);
      for (const d of docs) {
        expect(d.connectorId).toBe("c1");
      }
    });

    it("filters by documentType", async () => {
      const docs = await store.list({ documentType: "article" });
      expect(docs.length).toBe(2);
      for (const d of docs) {
        expect(d.documentType).toBe("article");
      }
    });

    it("filters by both connectorId and documentType", async () => {
      const docs = await store.list({
        connectorId: "c1",
        documentType: "article",
      });
      expect(docs.length).toBe(1);
      expect(docs[0].documentId).toBe("d1");
    });

    it("respects limit", async () => {
      const docs = await store.list({ limit: 2 });
      expect(docs.length).toBe(2);
    });

    it("respects offset", async () => {
      const docs = await store.list({ limit: 1, offset: 1 });
      expect(docs.length).toBe(1);
    });

    it("returns sorted by updatedAt descending", async () => {
      const docs = await store.list();
      expect(docs[0].updatedAt).toBeGreaterThanOrEqual(docs[1].updatedAt);
      expect(docs[1].updatedAt).toBeGreaterThanOrEqual(docs[2].updatedAt);
    });

    it("returns empty for no matches", async () => {
      const docs = await store.list({ connectorId: "nonexistent" });
      expect(docs).toEqual([]);
    });
  });

  describe("count", () => {
    it("returns 0 for empty store", async () => {
      const count = await store.count();
      expect(count).toBe(0);
    });

    it("returns correct count", async () => {
      await store.put("d1", makeDoc({ documentId: "d1" }));
      await store.put("d2", makeDoc({ documentId: "d2" }));
      const count = await store.count();
      expect(count).toBe(2);
    });
  });

  describe("clear", () => {
    it("removes all documents", async () => {
      await store.put("d1", makeDoc({ documentId: "d1" }));
      await store.put("d2", makeDoc({ documentId: "d2" }));
      await store.clear();
      const count = await store.count();
      expect(count).toBe(0);
    });

    it("works on empty store", async () => {
      await store.clear();
      const count = await store.count();
      expect(count).toBe(0);
    });
  });

  describe("custom table name", () => {
    it("uses custom table name", async () => {
      const customStore = new SQLiteDocumentStore(db, "custom_docs");
      await customStore.put("doc-1", makeDoc());
      const count = await customStore.count();
      expect(count).toBe(1);
    });
  });
});
