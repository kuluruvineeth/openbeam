import { describe, expect, test } from "bun:test";
import type { LessonlyTransformContext } from "@openbeam/types/services/connectors/lessonly";
import type { LessonlyAssignment } from "../api/assignments";
import type { LessonlyGroup } from "../api/groups";
import type { LessonlyLesson } from "../api/lessons";
import type { LessonlyPath } from "../api/paths";
import type { LessonlyUser } from "../api/users";
import { transformAssignment } from "../transformers/assignment";
import { transformGroup } from "../transformers/group";
import { transformLesson } from "../transformers/lesson";
import { transformPath } from "../transformers/path";
import { transformUser } from "../transformers/user";
import { buildLessonlyUrl, stripHtml } from "../transformers/utils";

const context: LessonlyTransformContext = {
  connectorId: "conn_lessonly_1",
  connectorType: "LESSONLY",
  teamId: "team_1",
  workspaceId: "ws_1",
  subdomain: "acme",
};

describe("transformLesson", () => {
  const lesson: LessonlyLesson = {
    id: 101,
    title: "Sales Onboarding 101",
    assignees_count: 45,
    completed_count: 30,
    description: "<p>Introduction to our <b>sales</b> process</p>",
    tags: [
      { id: 1, name: "onboarding" },
      { id: 2, name: "sales" },
    ],
    links: { shareable: "https://acme.lessonly.com/lessons/101" },
    retake_score: 80,
    public: false,
    created_at: "2025-03-10T10:00:00Z",
    updated_at: "2025-06-15T14:30:00Z",
    archived_at: null,
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformLesson(lesson, context);
    expect(doc.id).toBe("conn_lessonly_1_lesson_101");
    expect(doc.document_type).toBe("document");
    expect(doc.document_subtype).toBe("lesson");
    expect(doc.title).toBe("Sales Onboarding 101");
    expect(doc.source_type).toBe("lessonly");
    expect(doc.url).toBe("https://acme.lessonly.com/lessons/101");
    expect(doc.metadata?.assigneesCount).toBe("45");
    expect(doc.metadata?.completedCount).toBe("30");
    expect(doc.metadata?.tags).toBe("onboarding, sales");
    expect(doc.metadata?.retakeScore).toBe("80");
    expect(doc.checksum).toBeDefined();
    expect(doc.content).toContain("Introduction to our sales process");
    expect(doc.content).toContain("Tags: onboarding, sales");
  });
});

describe("transformPath", () => {
  const path: LessonlyPath = {
    id: 201,
    title: "New Hire Training",
    description: "Complete onboarding path for new employees",
    assignees_count: 20,
    lessons: [
      { id: 101, title: "Sales Onboarding 101", position: 1 },
      { id: 102, title: "Product Knowledge", position: 2 },
      { id: 103, title: "CRM Training", position: 3 },
    ],
    links: { shareable: "https://acme.lessonly.com/paths/201" },
    public: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-06-01T12:00:00Z",
    archived_at: null,
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformPath(path, context);
    expect(doc.id).toBe("conn_lessonly_1_path_201");
    expect(doc.document_type).toBe("project");
    expect(doc.document_subtype).toBe("learning_path");
    expect(doc.title).toBe("New Hire Training");
    expect(doc.metadata?.lessonCount).toBe("3");
    expect(doc.metadata?.assigneesCount).toBe("20");
    expect(doc.metadata?.isPublic).toBe("true");
    expect(doc.content).toContain("1. Sales Onboarding 101");
    expect(doc.content).toContain("2. Product Knowledge");
    expect(doc.content).toContain("3. CRM Training");
  });
});

describe("transformAssignment", () => {
  const assignment: LessonlyAssignment = {
    id: 301,
    assignee_id: 50,
    assignable_id: 101,
    assignable_type: "Lesson",
    due_by: "2025-07-01T00:00:00Z",
    reassigned_at: null,
    completed_at: "2025-06-20T10:00:00Z",
    score: 95,
    status: "Complete",
    started_at: "2025-06-15T09:00:00Z",
    updated_at: "2025-06-20T10:00:00Z",
    ext_uid: null,
    created_at: "2025-06-10T08:00:00Z",
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformAssignment(assignment, context);
    expect(doc.id).toBe("conn_lessonly_1_assignment_301");
    expect(doc.document_type).toBe("task");
    expect(doc.document_subtype).toBe("assignment");
    expect(doc.metadata?.assignableType).toBe("Lesson");
    expect(doc.metadata?.status).toBe("Complete");
    expect(doc.metadata?.score).toBe("95");
    expect(doc.content).toContain("Status: Complete");
    expect(doc.content).toContain("Score: 95");
  });
});

describe("transformGroup", () => {
  const group: LessonlyGroup = {
    id: 401,
    name: "Sales Team",
    description: "All sales representatives",
    members_count: 25,
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-05-10T00:00:00Z",
    archived_at: null,
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformGroup(group, context);
    expect(doc.id).toBe("conn_lessonly_1_group_401");
    expect(doc.document_type).toBe("resource");
    expect(doc.document_subtype).toBe("group");
    expect(doc.title).toBe("Sales Team");
    expect(doc.metadata?.membersCount).toBe("25");
    expect(doc.content).toContain("All sales representatives");
    expect(doc.content).toContain("Members: 25");
  });
});

describe("transformUser", () => {
  const user: LessonlyUser = {
    id: 501,
    name: "Jane Smith",
    email: "jane@acme.com",
    role: "learner",
    role_id: 2,
    groups: [
      { id: 401, name: "Sales Team" },
      { id: 402, name: "New Hires" },
    ],
    custom_user_field_data: {
      department: "Sales",
      start_date: "2025-01-15",
    },
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-06-01T00:00:00Z",
    archived_at: null,
  };

  test("produces valid GenericDocument", async () => {
    const doc = await transformUser(user, context);
    expect(doc.id).toBe("conn_lessonly_1_user_501");
    expect(doc.document_type).toBe("resource");
    expect(doc.document_subtype).toBe("user");
    expect(doc.title).toBe("Jane Smith");
    expect(doc.author_name).toBe("Jane Smith");
    expect(doc.metadata?.email).toBe("jane@acme.com");
    expect(doc.metadata?.role).toBe("learner");
    expect(doc.metadata?.groups).toBe("Sales Team, New Hires");
    expect(doc.content).toContain("Role: learner");
    expect(doc.content).toContain("Groups: Sales Team, New Hires");
    expect(doc.content).toContain("department: Sales");
  });
});

describe("utils", () => {
  test("buildLessonlyUrl constructs correct URL", () => {
    expect(buildLessonlyUrl("acme", "/lessons/101")).toBe(
      "https://acme.lessonly.com/lessons/101"
    );
  });

  test("stripHtml removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  test("stripHtml handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});
