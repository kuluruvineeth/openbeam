import { describe, expect, test } from "bun:test";
import type { PushDocument } from "@openbeam/types/services/connectors/custom";
import {
  type FieldMapperContext,
  mapBatchToGeneric,
  mapPushDocumentToGeneric,
} from "../field-mapper";

const BASE_CTX: FieldMapperContext = {
  connectorId: "conn_abc",
  teamId: "team_123",
  workspaceId: "ws_456",
  defaultDocumentType: "custom_document",
  defaultIsPublic: false,
  fieldMappings: {},
};

const MINIMAL_DOC: PushDocument = {
  id: "doc-1",
  title: "Test Document",
  content: "This is test content.",
};

describe("mapPushDocumentToGeneric", () => {
  test("maps minimal document with correct id format", () => {
    const result = mapPushDocumentToGeneric(MINIMAL_DOC, BASE_CTX);

    expect(result.id).toBe("conn_abc_custom_doc-1");
    expect(result.connector_id).toBe("conn_abc");
    expect(result.connector_type).toBe("CUSTOM");
    expect(result.team_id).toBe("team_123");
    expect(result.workspace_id).toBe("ws_456");
    expect(result.external_id).toBe("doc-1");
    expect(result.document_type).toBe("custom_document");
    expect(result.title).toBe("Test Document");
    expect(result.content).toBe("This is test content.");
    expect(result.is_public).toBe(false);
    expect(result.created_at).toBeGreaterThan(0);
    expect(result.updated_at).toBeGreaterThan(0);
    expect(result.indexed_at).toBeGreaterThan(0);
  });

  test("preserves all optional fields", () => {
    const doc: PushDocument = {
      id: "doc-2",
      title: "Full Doc",
      content: "Content here.",
      url: "https://example.com/doc",
      document_type: "article",
      is_public: true,
      author_name: "Alice",
      author_email: "alice@example.com",
      labels: ["important", "review"],
      status: "published",
      priority: "high",
      source_name: "Internal Wiki",
      source_path: "/wiki/docs/article",
      access_control: ["team:eng"],
    };

    const result = mapPushDocumentToGeneric(doc, BASE_CTX);

    expect(result.url).toBe("https://example.com/doc");
    expect(result.document_type).toBe("article");
    expect(result.is_public).toBe(true);
    expect(result.author_name).toBe("Alice");
    expect(result.author_email).toBe("alice@example.com");
    expect(result.labels).toEqual(["important", "review"]);
    expect(result.status).toBe("published");
    expect(result.priority).toBe("high");
    expect(result.source_name).toBe("Internal Wiki");
    expect(result.source_path).toBe("/wiki/docs/article");
    expect(result.access_control).toEqual(["team:eng"]);
  });

  test("converts ISO datetime strings to unix timestamps", () => {
    const doc: PushDocument = {
      id: "doc-3",
      title: "Timestamped",
      content: "Content.",
      created_at: "2026-01-15T10:30:00.000Z",
      updated_at: "2026-03-20T14:00:00.000Z",
    };

    const result = mapPushDocumentToGeneric(doc, BASE_CTX);

    expect(result.created_at).toBe(
      Math.floor(new Date("2026-01-15T10:30:00.000Z").getTime() / 1000)
    );
    expect(result.updated_at).toBe(
      Math.floor(new Date("2026-03-20T14:00:00.000Z").getTime() / 1000)
    );
  });

  test("passes through numeric timestamps as-is", () => {
    const doc: PushDocument = {
      id: "doc-4",
      title: "Numeric",
      content: "Content.",
      created_at: 1_700_000_000,
      updated_at: 1_700_100_000,
    };

    const result = mapPushDocumentToGeneric(doc, BASE_CTX);

    expect(result.created_at).toBe(1_700_000_000);
    expect(result.updated_at).toBe(1_700_100_000);
  });

  test("uses context defaults when document omits optional fields", () => {
    const ctx: FieldMapperContext = {
      ...BASE_CTX,
      defaultDocumentType: "wiki_page",
      defaultIsPublic: true,
    };

    const result = mapPushDocumentToGeneric(MINIMAL_DOC, ctx);

    expect(result.document_type).toBe("wiki_page");
    expect(result.is_public).toBe(true);
  });

  test("prefixes parent_id with connector scope", () => {
    const doc: PushDocument = {
      id: "child-1",
      title: "Child",
      content: "Child content.",
      parent_id: "parent-1",
    };

    const result = mapPushDocumentToGeneric(doc, BASE_CTX);

    expect(result.parent_id).toBe("conn_abc_custom_parent-1");
  });

  test("includes metadata as serialized JSON", () => {
    const doc: PushDocument = {
      id: "doc-meta",
      title: "Metadata Doc",
      content: "Content.",
      metadata: { department: "engineering", version: 3 },
    };

    const result = mapPushDocumentToGeneric(doc, BASE_CTX);

    expect(result.metadata).toEqual({ department: "engineering", version: 3 });
  });
});

describe("mapBatchToGeneric", () => {
  test("maps multiple documents", () => {
    const docs: PushDocument[] = [
      { id: "a", title: "A", content: "Content A" },
      { id: "b", title: "B", content: "Content B" },
      { id: "c", title: "C", content: "Content C" },
    ];

    const results = mapBatchToGeneric(docs, BASE_CTX);

    expect(results).toHaveLength(3);
    expect(results[0]?.id).toBe("conn_abc_custom_a");
    expect(results[1]?.id).toBe("conn_abc_custom_b");
    expect(results[2]?.id).toBe("conn_abc_custom_c");
  });

  test("returns empty array for empty input", () => {
    const results = mapBatchToGeneric([], BASE_CTX);
    expect(results).toHaveLength(0);
  });
});
