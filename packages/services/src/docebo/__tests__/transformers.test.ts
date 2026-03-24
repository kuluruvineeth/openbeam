import { describe, expect, test } from "bun:test";
import type { DoceboTransformContext } from "@openbeam/types/services/connectors/docebo";
import { transformDoceboCertification } from "../transformers/certification";
import { transformDoceboCourse } from "../transformers/course";
import { transformDoceboEnrollment } from "../transformers/enrollment";
import { transformDoceboLearningPlan } from "../transformers/learning-plan";
import { transformDoceboUser } from "../transformers/user";

const context: DoceboTransformContext = {
  connectorId: "conn_docebo_1",
  connectorType: "DOCEBO",
  teamId: "team_1",
  workspaceId: "ws_1",
  instanceUrl: "https://acme.docebosaas.com",
};

describe("transformDoceboCourse", () => {
  test("transforms a course with full metadata", () => {
    const doc = transformDoceboCourse(
      {
        id: 42,
        name: "Security Awareness",
        code: "SEC-101",
        type: "elearning",
        status: "published",
        description: "Annual security training for all employees",
        category: { id: 1, name: "Compliance" },
        duration: 60,
        language: "English",
        date_creation: "2025-01-10T00:00:00Z",
        date_last_updated: "2025-06-15T12:00:00Z",
        slug_name: "security-awareness",
        enrollment_count: 350,
        image_url: "",
      },
      context
    );

    expect(doc.id).toBe("conn_docebo_1_course_42");
    expect(doc.title).toBe("Security Awareness");
    expect(doc.document_type).toBe("course");
    expect(doc.content).toContain("Annual security training");
    expect(doc.content).toContain("Type: elearning");
    expect(doc.content).toContain("Category: Compliance");
    expect(doc.content).toContain("Duration: 60 minutes");
    expect(doc.metadata?.courseCode).toBe("SEC-101");
    expect(doc.metadata?.status).toBe("published");
    expect(doc.url).toBe("https://acme.docebosaas.com/course/42");
  });

  test("handles missing optional fields", () => {
    const doc = transformDoceboCourse(
      {
        id: 1,
        name: "Minimal Course",
        code: "",
        type: "",
        status: "",
        description: "",
        category: null,
        duration: 0,
        language: "",
        date_creation: "2025-01-01T00:00:00Z",
        date_last_updated: "2025-01-01T00:00:00Z",
        slug_name: "",
        enrollment_count: 0,
        image_url: "",
      },
      context
    );

    expect(doc.id).toBe("conn_docebo_1_course_1");
    expect(doc.title).toBe("Minimal Course");
  });
});

describe("transformDoceboLearningPlan", () => {
  test("transforms a learning plan", () => {
    const doc = transformDoceboLearningPlan(
      {
        id: 10,
        name: "New Hire Onboarding",
        description: "Complete onboarding program for new employees",
        status: "active",
        courses_count: 5,
        date_creation: "2025-02-01T00:00:00Z",
        date_last_updated: "2025-07-01T00:00:00Z",
        duration: 480,
        category: { id: 2, name: "Onboarding" },
      },
      context
    );

    expect(doc.id).toBe("conn_docebo_1_learning_plan_10");
    expect(doc.title).toBe("New Hire Onboarding");
    expect(doc.document_type).toBe("learning_plan");
    expect(doc.content).toContain("Courses: 5");
    expect(doc.content).toContain("Duration: 480 minutes");
    expect(doc.metadata?.category).toBe("Onboarding");
  });
});

describe("transformDoceboUser", () => {
  test("transforms a user profile", () => {
    const doc = transformDoceboUser(
      {
        user_id: 100,
        username: "jdoe",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@acme.com",
        role: "learner",
        status: "active",
        branch_name: "Engineering",
        date_creation: "2025-03-01T00:00:00Z",
        date_last_updated: "2025-08-01T00:00:00Z",
        expiration_date: null,
        language: "en",
      },
      context
    );

    expect(doc.id).toBe("conn_docebo_1_user_100");
    expect(doc.title).toBe("Jane Doe");
    expect(doc.document_type).toBe("user");
    expect(doc.content).toContain("Email: jane@acme.com");
    expect(doc.content).toContain("Role: learner");
    expect(doc.content).toContain("Branch: Engineering");
    expect(doc.metadata?.username).toBe("jdoe");
  });

  test("falls back to username when name is empty", () => {
    const doc = transformDoceboUser(
      {
        user_id: 101,
        username: "sys-admin",
        first_name: "",
        last_name: "",
        email: "",
        role: "admin",
        status: "active",
        branch_name: "",
        date_creation: "2025-01-01T00:00:00Z",
        date_last_updated: "2025-01-01T00:00:00Z",
        expiration_date: null,
        language: "",
      },
      context
    );

    expect(doc.title).toBe("sys-admin");
  });
});

describe("transformDoceboEnrollment", () => {
  test("transforms an enrollment record", () => {
    const doc = transformDoceboEnrollment(
      {
        id: 500,
        user_id: 100,
        username: "jdoe",
        user_fullname: "Jane Doe",
        course_id: 42,
        course_name: "Security Awareness",
        course_code: "SEC-101",
        status: "completed",
        completion_date: "2025-07-20T00:00:00Z",
        enrollment_date: "2025-06-01T00:00:00Z",
        date_last_updated: "2025-07-20T00:00:00Z",
        score: 95,
        progress: 100,
      },
      context
    );

    expect(doc.id).toBe("conn_docebo_1_enrollment_500");
    expect(doc.title).toBe("Jane Doe — Security Awareness");
    expect(doc.document_type).toBe("enrollment");
    expect(doc.content).toContain("Status: completed");
    expect(doc.content).toContain("Progress: 100%");
    expect(doc.content).toContain("Score: 95");
    expect(doc.metadata?.progress).toBe("100");
    expect(doc.metadata?.score).toBe("95");
  });
});

describe("transformDoceboCertification", () => {
  test("transforms a certification", () => {
    const doc = transformDoceboCertification(
      {
        id: 7,
        title: "HIPAA Compliance",
        code: "HIPAA-2025",
        description: "Annual HIPAA compliance certification",
        status: "active",
        duration: 30,
        expiration_days: 365,
        date_creation: "2025-01-15T00:00:00Z",
        date_last_updated: "2025-09-01T00:00:00Z",
      },
      context
    );

    expect(doc.id).toBe("conn_docebo_1_certification_7");
    expect(doc.title).toBe("HIPAA Compliance");
    expect(doc.document_type).toBe("certification");
    expect(doc.content).toContain("Annual HIPAA compliance");
    expect(doc.content).toContain("Expires after: 365 days");
    expect(doc.metadata?.certCode).toBe("HIPAA-2025");
    expect(doc.metadata?.expirationDays).toBe("365");
  });

  test("handles null expiration", () => {
    const doc = transformDoceboCertification(
      {
        id: 8,
        title: "No Expiry Cert",
        code: "",
        description: "",
        status: "active",
        duration: 0,
        expiration_days: null,
        date_creation: "2025-01-01T00:00:00Z",
        date_last_updated: "2025-01-01T00:00:00Z",
      },
      context
    );

    expect(doc.content).not.toContain("Expires after");
  });
});
