import { describe, expect, it } from "bun:test";
import type {
  WorkspaceFieldDefinition,
  WorkspaceObjectDefinition,
} from "@openbeam/types/services/workspace";
import {
  fieldTypeToDuckDB,
  generateDeleteObjectDDL,
  generateInsertFieldDDL,
  generateInsertObjectDDL,
} from "../duckdb/schema";

function createMockObject(
  overrides: Partial<WorkspaceObjectDefinition> = {}
): WorkspaceObjectDefinition {
  return {
    id: "obj_1",
    name: "leads",
    description: "Sales leads",
    icon: "users",
    color: "#2563eb",
    defaultView: "table",
    immutable: false,
    teamId: "team_1",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    fields: [],
    ...overrides,
  };
}

function createMockField(
  overrides: Partial<WorkspaceFieldDefinition> = {}
): WorkspaceFieldDefinition {
  return {
    id: "field_1",
    name: "email",
    type: "email",
    required: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("fieldTypeToDuckDB", () => {
  it("maps text types to VARCHAR", () => {
    expect(fieldTypeToDuckDB("text")).toBe("VARCHAR");
    expect(fieldTypeToDuckDB("email")).toBe("VARCHAR");
    expect(fieldTypeToDuckDB("phone")).toBe("VARCHAR");
    expect(fieldTypeToDuckDB("url")).toBe("VARCHAR");
  });

  it("maps numeric types to DOUBLE", () => {
    expect(fieldTypeToDuckDB("number")).toBe("DOUBLE");
    expect(fieldTypeToDuckDB("currency")).toBe("DOUBLE");
    expect(fieldTypeToDuckDB("percent")).toBe("DOUBLE");
  });

  it("maps boolean to BOOLEAN", () => {
    expect(fieldTypeToDuckDB("boolean")).toBe("BOOLEAN");
  });

  it("maps date to DATE", () => {
    expect(fieldTypeToDuckDB("date")).toBe("DATE");
  });

  it("maps datetime to TIMESTAMP", () => {
    expect(fieldTypeToDuckDB("datetime")).toBe("TIMESTAMP");
  });

  it("maps enum types to VARCHAR", () => {
    expect(fieldTypeToDuckDB("enum")).toBe("VARCHAR");
    expect(fieldTypeToDuckDB("multi_enum")).toBe("VARCHAR");
  });

  it("maps relation types to VARCHAR", () => {
    expect(fieldTypeToDuckDB("relation")).toBe("VARCHAR");
    expect(fieldTypeToDuckDB("user")).toBe("VARCHAR");
  });
});

describe("generateInsertObjectDDL", () => {
  it("generates valid INSERT SQL", () => {
    const obj = createMockObject();
    const sql = generateInsertObjectDDL(obj);

    expect(sql).toContain("INSERT INTO objects");
    expect(sql).toContain("obj_1");
    expect(sql).toContain("leads");
    expect(sql).toContain("Sales leads");
    expect(sql).toContain("team_1");
  });

  it("escapes single quotes in name", () => {
    const obj = createMockObject({ name: "lead's" });
    const sql = generateInsertObjectDDL(obj);

    expect(sql).toContain("lead''s");
  });

  it("handles NULL display_field", () => {
    const obj = createMockObject({ displayField: undefined });
    const sql = generateInsertObjectDDL(obj);

    expect(sql).toContain("NULL");
  });

  it("includes display_field when set", () => {
    const obj = createMockObject({ displayField: "company_name" });
    const sql = generateInsertObjectDDL(obj);

    expect(sql).toContain("company_name");
  });
});

describe("generateInsertFieldDDL", () => {
  it("generates valid field INSERT SQL", () => {
    const field = createMockField();
    const sql = generateInsertFieldDDL(field, "obj_1");

    expect(sql).toContain("INSERT INTO fields");
    expect(sql).toContain("field_1");
    expect(sql).toContain("obj_1");
    expect(sql).toContain("email");
  });

  it("serializes enum values as JSON", () => {
    const field = createMockField({
      type: "enum",
      enumValues: ["new", "qualified", "closed"],
    });
    const sql = generateInsertFieldDDL(field, "obj_1");

    expect(sql).toContain('["new","qualified","closed"]');
  });

  it("handles NULL optional fields", () => {
    const field = createMockField({
      defaultValue: undefined,
      relatedObjectId: undefined,
    });
    const sql = generateInsertFieldDDL(field, "obj_1");

    expect(sql).toContain("NULL");
  });
});

describe("generateDeleteObjectDDL", () => {
  it("returns cascading delete statements", () => {
    const statements = generateDeleteObjectDDL("obj_1");

    expect(statements).toHaveLength(4);
    expect(statements[0]).toContain("DELETE FROM entry_fields");
    expect(statements[1]).toContain("DELETE FROM entries");
    expect(statements[2]).toContain("DELETE FROM fields");
    expect(statements[3]).toContain("DELETE FROM objects");
  });

  it("references the correct object ID", () => {
    const statements = generateDeleteObjectDDL("obj_abc");

    for (const stmt of statements) {
      expect(stmt).toContain("obj_abc");
    }
  });
});
