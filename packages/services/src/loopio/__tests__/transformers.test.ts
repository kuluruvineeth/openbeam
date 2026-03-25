import { describe, expect, test } from "bun:test";
import type { LoopioTransformContext } from "@openbeam/types/services/connectors/loopio";
import type { LoopioLibraryEntry } from "../api/library-entries";
import type { LoopioProject } from "../api/projects";
import type { LoopioTag } from "../api/tags";
import { transformLibraryEntry } from "../transformers/library-entry";
import { transformProject } from "../transformers/project";
import { transformTag } from "../transformers/tag";
import { stripHtml } from "../transformers/utils";

const context: LoopioTransformContext = {
  connectorId: "conn_test_123",
  connectorType: "loopio",
  teamId: "team_test",
  workspaceId: "ws_test",
};

describe("stripHtml", () => {
  test("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  test("normalizes whitespace", () => {
    expect(stripHtml("<p>Hello</p>  <p>World</p>")).toBe("Hello World");
  });

  test("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("transformProject", () => {
  const project: LoopioProject = {
    id: "proj_1",
    name: "Acme RFP Response",
    description: "<p>Response to Acme Corp's request for proposal</p>",
    status: "in_progress",
    deadline: "2025-03-31T23:59:59Z",
    owner: { id: "u1", name: "Jane Doe", email: "jane@example.com" },
    question_count: 42,
    tags: ["enterprise", "saas"],
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-03-20T14:30:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformProject(project, context);
    expect(doc.id).toBe("conn_test_123_project_proj_1");
  });

  test("sets correct document type and source", async () => {
    const doc = await transformProject(project, context);
    expect(doc.document_type).toBe("project");
    expect(doc.source_type).toBe("loopio");
  });

  test("includes question count in metadata", async () => {
    const doc = await transformProject(project, context);
    expect(doc.metadata?.questionCount).toBe("42");
  });

  test("includes deadline in metadata", async () => {
    const doc = await transformProject(project, context);
    expect(doc.metadata?.deadline).toBe("2025-03-31T23:59:59Z");
  });

  test("strips HTML from description", async () => {
    const doc = await transformProject(project, context);
    expect(doc.content).toContain(
      "Response to Acme Corp's request for proposal"
    );
    expect(doc.content).not.toContain("<p>");
  });

  test("includes owner as author", async () => {
    const doc = await transformProject(project, context);
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.author_email).toBe("jane@example.com");
  });

  test("includes tags in metadata", async () => {
    const doc = await transformProject(project, context);
    expect(doc.metadata?.tags).toBe("enterprise, saas");
  });

  test("builds correct URL", async () => {
    const doc = await transformProject(project, context);
    expect(doc.url).toBe("https://app.loopio.com/projects/proj_1");
  });

  test("handles project without deadline", async () => {
    const noDeadline = { ...project, deadline: null };
    const doc = await transformProject(noDeadline, context);
    expect(doc.metadata?.deadline).toBeUndefined();
  });

  test("handles project without owner", async () => {
    const noOwner = { ...project, owner: null };
    const doc = await transformProject(noOwner, context);
    expect(doc.author_name).toBeUndefined();
  });
});

describe("transformLibraryEntry", () => {
  const entry: LoopioLibraryEntry = {
    id: "entry_1",
    question: "<p>What is your uptime SLA?</p>",
    answer: "<p>We guarantee 99.99% uptime as measured monthly.</p>",
    category: "Security & Compliance",
    tags: ["sla", "uptime"],
    last_reviewed_at: "2025-02-01T12:00:00Z",
    reviewed_by: {
      id: "u2",
      name: "John Smith",
      email: "john@example.com",
    },
    created_at: "2024-06-10T10:00:00Z",
    updated_at: "2025-02-01T12:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformLibraryEntry(entry, context);
    expect(doc.id).toBe("conn_test_123_library_entry_entry_1");
  });

  test("uses stripped question as title", async () => {
    const doc = await transformLibraryEntry(entry, context);
    expect(doc.title).toBe("What is your uptime SLA?");
  });

  test("includes Q&A in content", async () => {
    const doc = await transformLibraryEntry(entry, context);
    expect(doc.content).toContain("Q: What is your uptime SLA?");
    expect(doc.content).toContain(
      "A: We guarantee 99.99% uptime as measured monthly."
    );
  });

  test("includes category in metadata", async () => {
    const doc = await transformLibraryEntry(entry, context);
    expect(doc.metadata?.category).toBe("Security & Compliance");
  });

  test("includes reviewer as author", async () => {
    const doc = await transformLibraryEntry(entry, context);
    expect(doc.author_name).toBe("John Smith");
    expect(doc.author_email).toBe("john@example.com");
  });

  test("includes last reviewed date in metadata", async () => {
    const doc = await transformLibraryEntry(entry, context);
    expect(doc.metadata?.lastReviewed).toBe("2025-02-01T12:00:00Z");
  });

  test("handles entry without reviewer", async () => {
    const noReviewer = {
      ...entry,
      reviewed_by: null,
      last_reviewed_at: null,
    };
    const doc = await transformLibraryEntry(noReviewer, context);
    expect(doc.author_name).toBeUndefined();
    expect(doc.metadata?.lastReviewed).toBeUndefined();
  });
});

describe("transformTag", () => {
  const tag: LoopioTag = {
    id: "tag_1",
    name: "Security",
    entry_count: 25,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2025-03-01T00:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformTag(tag, context);
    expect(doc.id).toBe("conn_test_123_tag_tag_1");
  });

  test("sets tag name as title", async () => {
    const doc = await transformTag(tag, context);
    expect(doc.title).toBe("Security");
  });

  test("includes entry count in metadata", async () => {
    const doc = await transformTag(tag, context);
    expect(doc.metadata?.entryCount).toBe("25");
  });

  test("builds URL with encoded tag name", async () => {
    const doc = await transformTag(tag, context);
    expect(doc.url).toBe("https://app.loopio.com/library?tag=Security");
  });

  test("encodes special characters in tag URL", async () => {
    const specialTag = { ...tag, name: "Security & Compliance" };
    const doc = await transformTag(specialTag, context);
    expect(doc.url).toBe(
      "https://app.loopio.com/library?tag=Security%20%26%20Compliance"
    );
  });
});
