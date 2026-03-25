import { describe, expect, test } from "bun:test";
import type { MindtickleTransformContext } from "@openbeam/types/services/connectors/mindtickle";
import type { MindtickleContent } from "../api/content";
import type { MindtickleCourse } from "../api/courses";
import type { MindtickleMission } from "../api/missions";
import type { MindtickleModule } from "../api/modules";
import { transformContent } from "../transformers/content";
import { transformCourse } from "../transformers/course";
import { transformMission } from "../transformers/mission";
import { transformModule } from "../transformers/module";
import { stripHtml } from "../transformers/utils";

const context: MindtickleTransformContext = {
  connectorId: "conn_test_123",
  connectorType: "mindtickle",
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

describe("transformCourse", () => {
  const course: MindtickleCourse = {
    id: "course_1",
    name: "Sales Onboarding 101",
    description: "<p>Comprehensive onboarding program for new sales reps</p>",
    status: "published",
    category: "Onboarding",
    module_count: 8,
    duration_minutes: 120,
    created_by: {
      id: "u1",
      name: "Jane Trainer",
      email: "jane@example.com",
    },
    tags: ["onboarding", "new-hire"],
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-06-20T14:30:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.id).toBe("conn_test_123_course_course_1");
  });

  test("sets correct document type and source", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.document_type).toBe("course");
    expect(doc.source_type).toBe("mindtickle");
  });

  test("includes module count in metadata", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.metadata?.moduleCount).toBe("8");
  });

  test("strips HTML from description", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.content).toContain("Comprehensive onboarding program");
    expect(doc.content).not.toContain("<p>");
  });

  test("includes creator as author", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.author_name).toBe("Jane Trainer");
    expect(doc.author_email).toBe("jane@example.com");
  });

  test("includes tags in metadata", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.metadata?.tags).toBe("onboarding, new-hire");
  });

  test("includes category in metadata", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.metadata?.category).toBe("Onboarding");
  });

  test("includes duration in metadata", async () => {
    const doc = await transformCourse(course, context);
    expect(doc.metadata?.durationMinutes).toBe("120");
  });
});

describe("transformModule", () => {
  const mod: MindtickleModule = {
    id: "mod_1",
    title: "Prospecting Fundamentals",
    description: "<p>Learn the basics of prospecting</p>",
    content: "<p>Key techniques for identifying qualified leads</p>",
    module_type: "lesson",
    course_id: "course_1",
    course_name: "Sales Onboarding 101",
    duration_minutes: 15,
    order: 1,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-06-01T12:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformModule(mod, context);
    expect(doc.id).toBe("conn_test_123_module_mod_1");
  });

  test("includes course reference in metadata", async () => {
    const doc = await transformModule(mod, context);
    expect(doc.metadata?.courseName).toBe("Sales Onboarding 101");
    expect(doc.metadata?.courseId).toBe("course_1");
  });

  test("strips HTML from content", async () => {
    const doc = await transformModule(mod, context);
    expect(doc.content).toContain("Key techniques for identifying");
    expect(doc.content).not.toContain("<p>");
  });

  test("builds URL with course and module IDs", async () => {
    const doc = await transformModule(mod, context);
    expect(doc.url).toBe(
      "https://app.mindtickle.com/courses/course_1/modules/mod_1"
    );
  });
});

describe("transformMission", () => {
  const mission: MindtickleMission = {
    id: "mission_1",
    name: "Product Knowledge Quiz",
    description: "<p>Test your product knowledge</p>",
    mission_type: "quiz",
    status: "active",
    due_date: "2024-07-15",
    max_score: 100,
    passing_score: 80,
    created_by: {
      id: "u1",
      name: "John Manager",
      email: "john@example.com",
    },
    tags: ["product", "assessment"],
    created_at: "2024-06-01T09:00:00Z",
    updated_at: "2024-06-15T09:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformMission(mission, context);
    expect(doc.id).toBe("conn_test_123_mission_mission_1");
  });

  test("includes scoring in metadata", async () => {
    const doc = await transformMission(mission, context);
    expect(doc.metadata?.maxScore).toBe("100");
    expect(doc.metadata?.passingScore).toBe("80");
  });

  test("includes due date in metadata", async () => {
    const doc = await transformMission(mission, context);
    expect(doc.metadata?.dueDate).toBe("2024-07-15");
  });

  test("includes creator as author", async () => {
    const doc = await transformMission(mission, context);
    expect(doc.author_name).toBe("John Manager");
    expect(doc.author_email).toBe("john@example.com");
  });

  test("sets mission_type as document subtype", async () => {
    const doc = await transformMission(mission, context);
    expect(doc.document_subtype).toBe("quiz");
  });
});

describe("transformContent", () => {
  const item: MindtickleContent = {
    id: "content_1",
    title: "Product One-Pager",
    description: "Summary document for the flagship product",
    content_type: "document",
    category: "Sales Collateral",
    file_url: "https://cdn.mindtickle.com/files/product-one-pager.pdf",
    file_size: 2_097_152,
    tags: ["product", "collateral"],
    uploaded_by: {
      id: "u2",
      name: "Alice Marketing",
      email: "alice@example.com",
    },
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-06-10T08:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformContent(item, context);
    expect(doc.id).toBe("conn_test_123_content_content_1");
  });

  test("uses file_url as document URL", async () => {
    const doc = await transformContent(item, context);
    expect(doc.url).toBe(
      "https://cdn.mindtickle.com/files/product-one-pager.pdf"
    );
  });

  test("falls back to app URL when no file_url", async () => {
    const noUrl = { ...item, file_url: null };
    const doc = await transformContent(noUrl, context);
    expect(doc.url).toBe("https://app.mindtickle.com/content/content_1");
  });

  test("includes file size in metadata", async () => {
    const doc = await transformContent(item, context);
    expect(doc.metadata?.fileSize).toBe("2097152");
  });

  test("includes uploader as author", async () => {
    const doc = await transformContent(item, context);
    expect(doc.author_name).toBe("Alice Marketing");
    expect(doc.author_email).toBe("alice@example.com");
  });

  test("includes category in metadata", async () => {
    const doc = await transformContent(item, context);
    expect(doc.metadata?.category).toBe("Sales Collateral");
  });
});
