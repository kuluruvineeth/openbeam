import { describe, expect, it } from "bun:test";
import type { WorkspaceFieldDefinition } from "@openbeam/types/services/workspace";
import {
  isValidFieldType,
  validateEntryValues,
  validateFieldValue,
} from "../objects/fields";

function createMockFieldDef(
  overrides: Partial<WorkspaceFieldDefinition> = {}
): WorkspaceFieldDefinition {
  return {
    id: "field_1",
    name: "test_field",
    type: "text",
    required: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("isValidFieldType", () => {
  it("accepts all known field types", () => {
    const validTypes = [
      "text",
      "email",
      "phone",
      "url",
      "number",
      "currency",
      "percent",
      "boolean",
      "date",
      "datetime",
      "enum",
      "multi_enum",
      "relation",
      "user",
      "file",
      "richtext",
    ];

    for (const type of validTypes) {
      expect(isValidFieldType(type)).toBe(true);
    }
  });

  it("rejects unknown types", () => {
    expect(isValidFieldType("integer")).toBe(false);
    expect(isValidFieldType("")).toBe(false);
    expect(isValidFieldType("blob")).toBe(false);
  });
});

describe("validateFieldValue", () => {
  it("passes for optional empty values", () => {
    const field = createMockFieldDef({ required: false });
    expect(validateFieldValue(null, "text", field)).toBeNull();
    expect(validateFieldValue(undefined, "text", field)).toBeNull();
    expect(validateFieldValue("", "text", field)).toBeNull();
  });

  it("fails for required empty values", () => {
    const field = createMockFieldDef({ required: true });
    const error = validateFieldValue(null, "text", field);

    expect(error).not.toBeNull();
    expect(error?.message).toBe("Field is required");
  });

  it("validates email format", () => {
    const field = createMockFieldDef({ type: "email" });

    expect(validateFieldValue("test@example.com", "email", field)).toBeNull();
    expect(validateFieldValue("invalid", "email", field)).not.toBeNull();
    expect(validateFieldValue("@test", "email", field)).not.toBeNull();
  });

  it("validates URL format", () => {
    const field = createMockFieldDef({ type: "url" });

    expect(validateFieldValue("https://example.com", "url", field)).toBeNull();
    expect(validateFieldValue("http://test.org/path", "url", field)).toBeNull();
    expect(validateFieldValue("not-a-url", "url", field)).not.toBeNull();
  });

  it("validates phone format", () => {
    const field = createMockFieldDef({ type: "phone" });

    expect(validateFieldValue("+1 (555) 123-4567", "phone", field)).toBeNull();
    expect(validateFieldValue("ab", "phone", field)).not.toBeNull();
  });

  it("validates numeric types", () => {
    const field = createMockFieldDef({ type: "number" });

    expect(validateFieldValue("42", "number", field)).toBeNull();
    expect(validateFieldValue("3.14", "number", field)).toBeNull();
    expect(validateFieldValue("abc", "number", field)).not.toBeNull();
  });

  it("validates boolean values", () => {
    const field = createMockFieldDef({ type: "boolean" });

    expect(validateFieldValue("true", "boolean", field)).toBeNull();
    expect(validateFieldValue("false", "boolean", field)).toBeNull();
    expect(validateFieldValue("1", "boolean", field)).toBeNull();
    expect(validateFieldValue("0", "boolean", field)).toBeNull();
    expect(validateFieldValue("maybe", "boolean", field)).not.toBeNull();
  });

  it("validates date values", () => {
    const field = createMockFieldDef({ type: "date" });

    expect(validateFieldValue("2024-01-15", "date", field)).toBeNull();
    expect(validateFieldValue("not-a-date", "date", field)).not.toBeNull();
  });

  it("validates datetime values", () => {
    const field = createMockFieldDef({ type: "datetime" });

    expect(
      validateFieldValue("2024-01-15T10:30:00Z", "datetime", field)
    ).toBeNull();
    expect(validateFieldValue("invalid", "datetime", field)).not.toBeNull();
  });

  it("validates enum against allowed values", () => {
    const field = createMockFieldDef({
      type: "enum",
      enumValues: ["new", "qualified", "closed"],
    });

    expect(validateFieldValue("new", "enum", field)).toBeNull();
    expect(validateFieldValue("qualified", "enum", field)).toBeNull();
    expect(validateFieldValue("unknown", "enum", field)).not.toBeNull();
  });

  it("validates multi_enum against allowed values", () => {
    const field = createMockFieldDef({
      type: "multi_enum",
      enumValues: ["tag1", "tag2", "tag3"],
    });

    expect(
      validateFieldValue('["tag1","tag2"]', "multi_enum", field)
    ).toBeNull();
    expect(
      validateFieldValue('["tag1","invalid"]', "multi_enum", field)
    ).not.toBeNull();
  });

  it("accepts any value for text fields", () => {
    const field = createMockFieldDef({ type: "text" });

    expect(validateFieldValue("anything", "text", field)).toBeNull();
    expect(validateFieldValue("123", "text", field)).toBeNull();
  });
});

describe("validateEntryValues", () => {
  it("returns empty array for valid entries", () => {
    const fields = [
      createMockFieldDef({ name: "name", type: "text" }),
      createMockFieldDef({ name: "email", type: "email" }),
    ];

    const errors = validateEntryValues(
      { name: "John", email: "john@example.com" },
      fields
    );

    expect(errors).toHaveLength(0);
  });

  it("collects multiple validation errors", () => {
    const fields = [
      createMockFieldDef({ name: "name", type: "text", required: true }),
      createMockFieldDef({ name: "email", type: "email" }),
    ];

    const errors = validateEntryValues({ email: "not-an-email" }, fields);

    expect(errors).toHaveLength(2);
    expect(errors[0]?.field).toBe("name");
    expect(errors[1]?.field).toBe("email");
  });

  it("validates required fields", () => {
    const fields = [
      createMockFieldDef({ name: "company", type: "text", required: true }),
    ];

    const errors = validateEntryValues({}, fields);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("company");
    expect(errors[0]?.message).toBe("Field is required");
  });
});
