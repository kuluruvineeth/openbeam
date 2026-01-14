import { describe, expect, it } from "bun:test";
import {
  checkDocumentWarnings,
  validateDocument,
  validateDocuments,
} from "../feed";
import type { GenericDocument } from "../schemas";

function createValidDocument(
  overrides: Partial<GenericDocument> = {}
): GenericDocument {
  return {
    id: "doc_123",
    connector_id: "conn_456",
    connector_type: "linear",
    team_id: "team_789",
    workspace_id: "ws_abc",
    external_id: "ext_def",
    document_type: "issue",
    title: "Test Document Title",
    content:
      "This is the content of the test document with enough text to pass validation.",
    created_at: Date.now(),
    updated_at: Date.now(),
    is_public: false,
    ...overrides,
  } as GenericDocument;
}

describe("validateDocument", () => {
  it("returns empty errors for valid document", () => {
    const doc = createValidDocument();
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(0);
  });

  it("returns error for missing id", () => {
    const doc = createValidDocument({ id: "" });
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("id");
    expect(errors[0]?.code).toBe("REQUIRED");
  });

  it("returns error for missing connector_id", () => {
    const doc = createValidDocument({ connector_id: "" });
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("connector_id");
    expect(errors[0]?.code).toBe("REQUIRED");
  });

  it("returns error for missing title", () => {
    const doc = createValidDocument({ title: "" });
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("title");
    expect(errors[0]?.code).toBe("REQUIRED");
  });

  it("returns error for title exceeding max length", () => {
    const doc = createValidDocument({ title: "x".repeat(1001) });
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("title");
    expect(errors[0]?.code).toBe("TOO_LONG");
  });

  it("returns error for content exceeding max length", () => {
    const doc = createValidDocument({ content: "x".repeat(1_000_001) });
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("content");
    expect(errors[0]?.code).toBe("TOO_LONG");
  });

  it("returns error for non-numeric created_at", () => {
    const doc = createValidDocument({
      created_at: "not-a-number" as unknown as number,
    });
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("created_at");
    expect(errors[0]?.code).toBe("INVALID_TYPE");
  });

  it("returns error for non-numeric updated_at", () => {
    const doc = createValidDocument({
      updated_at: "not-a-number" as unknown as number,
    });
    const errors = validateDocument(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("updated_at");
    expect(errors[0]?.code).toBe("INVALID_TYPE");
  });

  it("returns multiple errors for multiple issues", () => {
    const doc = createValidDocument({
      id: "",
      title: "",
      content: "",
    });
    const errors = validateDocument(doc);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkDocumentWarnings", () => {
  it("returns warning when no embedding present", () => {
    const doc = createValidDocument();
    const warnings = checkDocumentWarnings(doc);
    const embeddingWarning = warnings.find((w) => w.field === "embedding");
    expect(embeddingWarning).toBeDefined();
    expect(embeddingWarning?.code).toBe("MISSING_OPTIONAL");
  });

  it("returns warning when no URL present", () => {
    const doc = createValidDocument();
    const warnings = checkDocumentWarnings(doc);
    const urlWarning = warnings.find((w) => w.field === "url");
    expect(urlWarning).toBeDefined();
    expect(urlWarning?.code).toBe("MISSING_OPTIONAL");
  });

  it("returns warning when no author information present", () => {
    const doc = createValidDocument();
    const warnings = checkDocumentWarnings(doc);
    const authorWarning = warnings.find((w) => w.field === "author_name");
    expect(authorWarning).toBeDefined();
    expect(authorWarning?.code).toBe("MISSING_OPTIONAL");
  });

  it("returns warning for very short content", () => {
    const doc = createValidDocument({ content: "Short" });
    const warnings = checkDocumentWarnings(doc);
    const contentWarning = warnings.find(
      (w) => w.field === "content" && w.code === "SUBOPTIMAL"
    );
    expect(contentWarning).toBeDefined();
  });

  it("does not warn about embedding when embedding is present", () => {
    const doc = createValidDocument({ embedding: [0.1, 0.2, 0.3] });
    const warnings = checkDocumentWarnings(doc);
    const embeddingWarning = warnings.find((w) => w.field === "embedding");
    expect(embeddingWarning).toBeUndefined();
  });

  it("does not warn about embedding when content_embedding is present", () => {
    const doc = createValidDocument({ content_embedding: [0.1, 0.2, 0.3] });
    const warnings = checkDocumentWarnings(doc);
    const embeddingWarning = warnings.find((w) => w.field === "embedding");
    expect(embeddingWarning).toBeUndefined();
  });

  it("does not warn about URL when URL is present", () => {
    const doc = createValidDocument({ url: "https://example.com" });
    const warnings = checkDocumentWarnings(doc);
    const urlWarning = warnings.find((w) => w.field === "url");
    expect(urlWarning).toBeUndefined();
  });

  it("does not warn about author when author_name is present", () => {
    const doc = createValidDocument({ author_name: "John Doe" });
    const warnings = checkDocumentWarnings(doc);
    const authorWarning = warnings.find((w) => w.field === "author_name");
    expect(authorWarning).toBeUndefined();
  });

  it("does not warn about author when author_id is present", () => {
    const doc = createValidDocument({ author_id: "user_123" });
    const warnings = checkDocumentWarnings(doc);
    const authorWarning = warnings.find((w) => w.field === "author_name");
    expect(authorWarning).toBeUndefined();
  });
});

describe("validateDocuments", () => {
  it("returns valid true for array of valid documents", () => {
    const docs = [
      createValidDocument(),
      createValidDocument({ id: "doc_456" }),
    ];
    const result = validateDocuments(docs);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid false when any document has errors", () => {
    const docs = [
      createValidDocument(),
      createValidDocument({ id: "", title: "" }),
    ];
    const result = validateDocuments(docs);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("prefixes error fields with document id", () => {
    const docs = [createValidDocument({ id: "doc_bad", title: "" })];
    const result = validateDocuments(docs);
    expect(result.errors[0]?.field).toContain("doc_bad.");
  });

  it("aggregates warnings from all documents", () => {
    const docs = [
      createValidDocument({ id: "doc_1" }),
      createValidDocument({ id: "doc_2" }),
    ];
    const result = validateDocuments(docs);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles empty document array", () => {
    const result = validateDocuments([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
