import { describe, expect, it } from "bun:test";
import {
  EdgeDocumentListOptionsSchema,
  type EdgeDocumentRecord,
  EdgeDocumentRecordSchema,
  type EdgeSearchQuery,
  EdgeSearchQuerySchema,
  type EdgeSearchResponse,
  EdgeSearchResponseSchema,
  EdgeSearchResultSchema,
} from "../search";

describe("EdgeSearchResultSchema", () => {
  it("parses valid result", () => {
    const result = EdgeSearchResultSchema.parse({
      documentId: "doc-1",
      title: "Quarterly Report",
      snippet: "Revenue increased by 15%...",
      score: 0.95,
      connectorId: "conn-1",
    });
    expect(result.documentId).toBe("doc-1");
    expect(result.ftsScore).toBeUndefined();
  });

  it("accepts optional scores", () => {
    const result = EdgeSearchResultSchema.parse({
      documentId: "doc-2",
      title: "Test",
      snippet: "...",
      score: 0.8,
      ftsScore: 0.7,
      vectorScore: 0.9,
      connectorId: "conn-1",
      documentType: "page",
      updatedAt: Date.now(),
      metadata: { author: "Alice" },
    });
    expect(result.ftsScore).toBe(0.7);
    expect(result.vectorScore).toBe(0.9);
  });
});

describe("EdgeSearchQuerySchema", () => {
  it("parses minimal query", () => {
    const query: EdgeSearchQuery = EdgeSearchQuerySchema.parse({
      query: "revenue",
    });
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(0);
  });

  it("accepts all fields", () => {
    const query = EdgeSearchQuerySchema.parse({
      query: "quarterly report",
      limit: 20,
      offset: 5,
      connectorIds: ["conn-1", "conn-2"],
      documentTypes: ["page", "document"],
      dateRange: { from: 1000, to: 2000 },
      hybridAlpha: 0.7,
    });
    expect(query.connectorIds).toHaveLength(2);
    expect(query.hybridAlpha).toBe(0.7);
  });

  it("rejects empty query", () => {
    expect(() => EdgeSearchQuerySchema.parse({ query: "" })).toThrow();
  });

  it("rejects negative offset", () => {
    expect(() =>
      EdgeSearchQuerySchema.parse({ query: "test", offset: -1 })
    ).toThrow();
  });
});

describe("EdgeSearchResponseSchema", () => {
  it("parses valid response", () => {
    const response: EdgeSearchResponse = EdgeSearchResponseSchema.parse({
      results: [
        {
          documentId: "doc-1",
          title: "Test",
          snippet: "...",
          score: 0.9,
          connectorId: "conn-1",
        },
      ],
      totalHits: 42,
      queryTimeMs: 15.3,
      searchMode: "hybrid",
    });
    expect(response.results).toHaveLength(1);
    expect(response.searchMode).toBe("hybrid");
  });

  it("accepts empty results", () => {
    const response = EdgeSearchResponseSchema.parse({
      results: [],
      totalHits: 0,
      queryTimeMs: 2.1,
      searchMode: "fts_only",
    });
    expect(response.results).toHaveLength(0);
  });
});

describe("EdgeDocumentRecordSchema", () => {
  it("parses valid record", () => {
    const now = Date.now();
    const record: EdgeDocumentRecord = EdgeDocumentRecordSchema.parse({
      documentId: "doc-1",
      connectorId: "conn-1",
      title: "Test Document",
      content: "Some content here",
      createdAt: now,
      updatedAt: now,
    });
    expect(record.documentId).toBe("doc-1");
    expect(record.checksum).toBeUndefined();
  });

  it("accepts all optional fields", () => {
    const now = Date.now();
    const record = EdgeDocumentRecordSchema.parse({
      documentId: "doc-2",
      connectorId: "conn-1",
      title: "Full Record",
      content: "Content",
      documentType: "page",
      checksum: "abc123",
      metadata: { tags: ["important"] },
      createdAt: now,
      updatedAt: now,
    });
    expect(record.documentType).toBe("page");
    expect(record.checksum).toBe("abc123");
  });
});

describe("EdgeDocumentListOptionsSchema", () => {
  it("uses defaults", () => {
    const opts = EdgeDocumentListOptionsSchema.parse({});
    expect(opts.limit).toBe(100);
    expect(opts.offset).toBe(0);
  });

  it("accepts filters", () => {
    const opts = EdgeDocumentListOptionsSchema.parse({
      connectorId: "conn-1",
      documentType: "page",
      limit: 50,
      offset: 10,
    });
    expect(opts.connectorId).toBe("conn-1");
  });
});
