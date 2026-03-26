import { describe, expect, it } from "bun:test";
import type {
  CustomPullTransformContext,
  EndpointDefinition,
} from "@openbeam/types/services/connectors/custom-pull";
import { mapItemToDocument } from "../mapping";
import { FieldMappingError } from "../types";

const baseContext: CustomPullTransformContext = {
  connectorId: "conn_123",
  connectorType: "CUSTOM",
  teamId: "team_abc",
  workspaceId: "ws_xyz",
  slug: "test-connector",
};

const baseEndpoint: EndpointDefinition = {
  id: "issues",
  path: "/api/issues",
  method: "GET",
  itemsPath: "data",
  documentType: "issue",
  pagination: { strategy: "none" },
  fieldMappings: [
    { sourcePath: "id", targetField: "external_id" },
    { sourcePath: "title", targetField: "title" },
    { sourcePath: "body", targetField: "content" },
  ],
};

describe("mapItemToDocument", () => {
  it("maps basic fields from API response item", () => {
    const item = {
      id: "42",
      title: "Fix login bug",
      body: "The login page crashes",
    };
    const doc = mapItemToDocument(item, baseEndpoint, baseContext);

    expect(doc.id).toBe("conn_123_issue_42");
    expect(doc.external_id).toBe("42");
    expect(doc.title).toBe("Fix login bug");
    expect(doc.document_type).toBe("issue");
    expect(doc.connector_id).toBe("conn_123");
    expect(doc.team_id).toBe("team_abc");
    expect(doc.is_public).toBe(false);
  });

  it("applies content template", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      contentTemplate: "Title: {{title}}\n\nDescription: {{body}}",
    };
    const item = { id: "1", title: "Feature X", body: "Add feature X" };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.content).toBe("Title: Feature X\n\nDescription: Add feature X");
  });

  it("assembles content from multiple fields", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      contentFields: ["summary", "description", "notes"],
    };
    const item = {
      id: "1",
      title: "Item",
      summary: "Summary text",
      description: "Description text",
    };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.content).toBe("Summary text\n\nDescription text");
  });

  it("applies URL template", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      urlTemplate: "https://app.example.com/issues/{{id}}",
    };
    const item = { id: "99", title: "Test", body: "content" };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.url).toBe("https://app.example.com/issues/99");
  });

  it("applies transform: timestamp from ISO string", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      fieldMappings: [
        { sourcePath: "id", targetField: "external_id" },
        { sourcePath: "title", targetField: "title" },
        {
          sourcePath: "created",
          targetField: "created_at",
          transform: "timestamp",
        },
      ],
    };
    const item = { id: "1", title: "T", created: "2026-01-15T10:30:00Z" };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.created_at).toBe(
      Math.floor(new Date("2026-01-15T10:30:00Z").getTime() / 1000)
    );
  });

  it("applies transform: strip_html", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      fieldMappings: [
        { sourcePath: "id", targetField: "external_id" },
        { sourcePath: "title", targetField: "title" },
        {
          sourcePath: "html_body",
          targetField: "content",
          transform: "strip_html",
        },
      ],
    };
    const item = {
      id: "1",
      title: "T",
      html_body: "<h1>Hello</h1><p>World</p>",
    };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.content).not.toContain("<h1>");
    expect(doc.content).toContain("Hello");
    expect(doc.content).toContain("World");
  });

  it("applies transform: join for arrays", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      fieldMappings: [
        { sourcePath: "id", targetField: "external_id" },
        { sourcePath: "title", targetField: "title" },
        { sourcePath: "tags", targetField: "content", transform: "join" },
      ],
    };
    const item = { id: "1", title: "T", tags: ["bug", "urgent", "backend"] };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.content).toBe("bug, urgent, backend");
  });

  it("uses default value when source path resolves to undefined", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      fieldMappings: [
        { sourcePath: "id", targetField: "external_id" },
        { sourcePath: "title", targetField: "title", defaultValue: "Untitled" },
        {
          sourcePath: "missing_field",
          targetField: "status",
          defaultValue: "open",
        },
      ],
    };
    const item = { id: "1" };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.title).toBe("Untitled");
    expect(doc.status).toBe("open");
  });

  it("resolves nested field paths", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      fieldMappings: [
        { sourcePath: "id", targetField: "external_id" },
        { sourcePath: "author.name", targetField: "author_name" },
        { sourcePath: "author.email", targetField: "author_email" },
        { sourcePath: "meta.title", targetField: "title" },
      ],
    };
    const item = {
      id: "1",
      author: { name: "Jane", email: "jane@example.com" },
      meta: { title: "Deep Nested Title" },
    };
    const doc = mapItemToDocument(item, endpoint, baseContext);

    expect(doc.author_name).toBe("Jane");
    expect(doc.author_email).toBe("jane@example.com");
    expect(doc.title).toBe("Deep Nested Title");
  });

  it("throws FieldMappingError when no external_id or id mapped", () => {
    const endpoint: EndpointDefinition = {
      ...baseEndpoint,
      fieldMappings: [{ sourcePath: "title", targetField: "title" }],
    };
    const item = { title: "No ID" };

    expect(() => mapItemToDocument(item, endpoint, baseContext)).toThrow(
      FieldMappingError
    );
  });

  it("falls back to source_name from slug when not mapped", () => {
    const item = { id: "1", title: "Test" };
    const doc = mapItemToDocument(item, baseEndpoint, baseContext);

    expect(doc.source_name).toBe("test-connector");
  });
});
