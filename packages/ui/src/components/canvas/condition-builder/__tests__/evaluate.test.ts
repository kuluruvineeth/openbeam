import { describe, expect, it } from "bun:test";
import type {
  ConditionBranch,
  ConditionGroup,
  SingleCondition,
} from "@openplane/types/canvas";
import {
  evaluateBranch,
  evaluateBranches,
  evaluateCondition,
  evaluateGroup,
} from "../evaluate";

function createCondition(
  overrides: Partial<SingleCondition> & Pick<SingleCondition, "operator">
): SingleCondition {
  return {
    id: "test-condition",
    field: "value",
    dataType: "string",
    value: undefined,
    secondValue: undefined,
    ...overrides,
  };
}

function createGroup(
  conditions: SingleCondition[],
  logic: "and" | "or" = "and"
): ConditionGroup {
  return {
    id: "test-group",
    logic,
    conditions,
  };
}

function createBranch(
  groups: ConditionGroup[],
  label = "Test Branch",
  id = "test-branch"
): ConditionBranch {
  return {
    id,
    label,
    groups,
  };
}

describe("evaluateCondition", () => {
  describe("existence operators", () => {
    it("exists returns true when field has value", () => {
      const condition = createCondition({
        field: "name",
        operator: "exists",
      });
      expect(evaluateCondition(condition, { name: "John" })).toBe(true);
    });

    it("exists returns true for empty string", () => {
      const condition = createCondition({
        field: "name",
        operator: "exists",
      });
      expect(evaluateCondition(condition, { name: "" })).toBe(true);
    });

    it("exists returns true for zero", () => {
      const condition = createCondition({
        field: "count",
        operator: "exists",
      });
      expect(evaluateCondition(condition, { count: 0 })).toBe(true);
    });

    it("exists returns true for false boolean", () => {
      const condition = createCondition({
        field: "active",
        operator: "exists",
      });
      expect(evaluateCondition(condition, { active: false })).toBe(true);
    });

    it("exists returns false for undefined", () => {
      const condition = createCondition({
        field: "name",
        operator: "exists",
      });
      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it("exists returns false for null", () => {
      const condition = createCondition({
        field: "name",
        operator: "exists",
      });
      expect(evaluateCondition(condition, { name: null })).toBe(false);
    });

    it("not_exists returns true for missing field", () => {
      const condition = createCondition({
        field: "name",
        operator: "not_exists",
      });
      expect(evaluateCondition(condition, {})).toBe(true);
    });

    it("not_exists returns true for null", () => {
      const condition = createCondition({
        field: "name",
        operator: "not_exists",
      });
      expect(evaluateCondition(condition, { name: null })).toBe(true);
    });

    it("not_exists returns false when field exists", () => {
      const condition = createCondition({
        field: "name",
        operator: "not_exists",
      });
      expect(evaluateCondition(condition, { name: "John" })).toBe(false);
    });
  });

  describe("string operators", () => {
    it("equals matches identical strings", () => {
      const condition = createCondition({
        field: "status",
        dataType: "string",
        operator: "equals",
        value: "active",
      });
      expect(evaluateCondition(condition, { status: "active" })).toBe(true);
    });

    it("equals returns false for different strings", () => {
      const condition = createCondition({
        field: "status",
        dataType: "string",
        operator: "equals",
        value: "active",
      });
      expect(evaluateCondition(condition, { status: "inactive" })).toBe(false);
    });

    it("equals is case-sensitive", () => {
      const condition = createCondition({
        field: "status",
        dataType: "string",
        operator: "equals",
        value: "Active",
      });
      expect(evaluateCondition(condition, { status: "active" })).toBe(false);
    });

    it("not_equals returns true for different strings", () => {
      const condition = createCondition({
        field: "status",
        dataType: "string",
        operator: "not_equals",
        value: "active",
      });
      expect(evaluateCondition(condition, { status: "inactive" })).toBe(true);
    });

    it("contains finds substring", () => {
      const condition = createCondition({
        field: "email",
        dataType: "string",
        operator: "contains",
        value: "@example",
      });
      expect(evaluateCondition(condition, { email: "user@example.com" })).toBe(
        true
      );
    });

    it("contains returns false when substring missing", () => {
      const condition = createCondition({
        field: "email",
        dataType: "string",
        operator: "contains",
        value: "@test",
      });
      expect(evaluateCondition(condition, { email: "user@example.com" })).toBe(
        false
      );
    });

    it("not_contains returns true when substring missing", () => {
      const condition = createCondition({
        field: "email",
        dataType: "string",
        operator: "not_contains",
        value: "@test",
      });
      expect(evaluateCondition(condition, { email: "user@example.com" })).toBe(
        true
      );
    });

    it("starts_with matches prefix", () => {
      const condition = createCondition({
        field: "code",
        dataType: "string",
        operator: "starts_with",
        value: "PRE-",
      });
      expect(evaluateCondition(condition, { code: "PRE-12345" })).toBe(true);
    });

    it("ends_with matches suffix", () => {
      const condition = createCondition({
        field: "filename",
        dataType: "string",
        operator: "ends_with",
        value: ".pdf",
      });
      expect(evaluateCondition(condition, { filename: "report.pdf" })).toBe(
        true
      );
    });

    it("is_empty returns true for empty string", () => {
      const condition = createCondition({
        field: "note",
        dataType: "string",
        operator: "is_empty",
      });
      expect(evaluateCondition(condition, { note: "" })).toBe(true);
    });

    it("is_empty returns false for non-empty string", () => {
      const condition = createCondition({
        field: "note",
        dataType: "string",
        operator: "is_empty",
      });
      expect(evaluateCondition(condition, { note: "hello" })).toBe(false);
    });

    it("is_not_empty returns true for non-empty string", () => {
      const condition = createCondition({
        field: "note",
        dataType: "string",
        operator: "is_not_empty",
      });
      expect(evaluateCondition(condition, { note: "hello" })).toBe(true);
    });

    it("matches_regex validates pattern", () => {
      const condition = createCondition({
        field: "phone",
        dataType: "string",
        operator: "matches_regex",
        value: "^\\d{3}-\\d{4}$",
      });
      expect(evaluateCondition(condition, { phone: "123-4567" })).toBe(true);
    });

    it("matches_regex returns false for non-match", () => {
      const condition = createCondition({
        field: "phone",
        dataType: "string",
        operator: "matches_regex",
        value: "^\\d{3}-\\d{4}$",
      });
      expect(evaluateCondition(condition, { phone: "not-a-phone" })).toBe(
        false
      );
    });

    it("matches_regex handles invalid regex gracefully", () => {
      const condition = createCondition({
        field: "text",
        dataType: "string",
        operator: "matches_regex",
        value: "[invalid(regex",
      });
      expect(evaluateCondition(condition, { text: "test" })).toBe(false);
    });

    it("handles null field value as empty string", () => {
      const condition = createCondition({
        field: "name",
        dataType: "string",
        operator: "is_empty",
      });
      expect(evaluateCondition(condition, { name: null })).toBe(true);
    });

    it("handles undefined field value as empty string", () => {
      const condition = createCondition({
        field: "name",
        dataType: "string",
        operator: "is_empty",
      });
      expect(evaluateCondition(condition, {})).toBe(true);
    });
  });

  describe("number operators", () => {
    it("equals matches identical numbers", () => {
      const condition = createCondition({
        field: "age",
        dataType: "number",
        operator: "equals",
        value: 25,
      });
      expect(evaluateCondition(condition, { age: 25 })).toBe(true);
    });

    it("equals matches string representation of number", () => {
      const condition = createCondition({
        field: "age",
        dataType: "number",
        operator: "equals",
        value: 25,
      });
      expect(evaluateCondition(condition, { age: "25" })).toBe(true);
    });

    it("not_equals returns true for different numbers", () => {
      const condition = createCondition({
        field: "count",
        dataType: "number",
        operator: "not_equals",
        value: 10,
      });
      expect(evaluateCondition(condition, { count: 5 })).toBe(true);
    });

    it("greater_than compares correctly", () => {
      const condition = createCondition({
        field: "price",
        dataType: "number",
        operator: "greater_than",
        value: 100,
      });
      expect(evaluateCondition(condition, { price: 150 })).toBe(true);
      expect(evaluateCondition(condition, { price: 100 })).toBe(false);
      expect(evaluateCondition(condition, { price: 50 })).toBe(false);
    });

    it("less_than compares correctly", () => {
      const condition = createCondition({
        field: "price",
        dataType: "number",
        operator: "less_than",
        value: 100,
      });
      expect(evaluateCondition(condition, { price: 50 })).toBe(true);
      expect(evaluateCondition(condition, { price: 100 })).toBe(false);
      expect(evaluateCondition(condition, { price: 150 })).toBe(false);
    });

    it("greater_or_equal includes boundary", () => {
      const condition = createCondition({
        field: "score",
        dataType: "number",
        operator: "greater_or_equal",
        value: 70,
      });
      expect(evaluateCondition(condition, { score: 70 })).toBe(true);
      expect(evaluateCondition(condition, { score: 80 })).toBe(true);
      expect(evaluateCondition(condition, { score: 69 })).toBe(false);
    });

    it("less_or_equal includes boundary", () => {
      const condition = createCondition({
        field: "score",
        dataType: "number",
        operator: "less_or_equal",
        value: 70,
      });
      expect(evaluateCondition(condition, { score: 70 })).toBe(true);
      expect(evaluateCondition(condition, { score: 60 })).toBe(true);
      expect(evaluateCondition(condition, { score: 71 })).toBe(false);
    });

    it("is_between checks inclusive range", () => {
      const condition = createCondition({
        field: "temp",
        dataType: "number",
        operator: "is_between",
        value: 20,
        secondValue: 30,
      });
      expect(evaluateCondition(condition, { temp: 20 })).toBe(true);
      expect(evaluateCondition(condition, { temp: 25 })).toBe(true);
      expect(evaluateCondition(condition, { temp: 30 })).toBe(true);
      expect(evaluateCondition(condition, { temp: 19 })).toBe(false);
      expect(evaluateCondition(condition, { temp: 31 })).toBe(false);
    });

    it("handles non-numeric field value", () => {
      const condition = createCondition({
        field: "count",
        dataType: "number",
        operator: "equals",
        value: 10,
      });
      expect(evaluateCondition(condition, { count: "not-a-number" })).toBe(
        false
      );
    });

    it("handles null field value", () => {
      const condition = createCondition({
        field: "count",
        dataType: "number",
        operator: "equals",
        value: 0,
      });
      expect(evaluateCondition(condition, { count: null })).toBe(false);
    });

    it("handles floating point numbers", () => {
      const condition = createCondition({
        field: "rate",
        dataType: "number",
        operator: "equals",
        value: 3.14,
      });
      expect(evaluateCondition(condition, { rate: 3.14 })).toBe(true);
    });

    it("handles negative numbers", () => {
      const condition = createCondition({
        field: "balance",
        dataType: "number",
        operator: "less_than",
        value: 0,
      });
      expect(evaluateCondition(condition, { balance: -100 })).toBe(true);
    });
  });

  describe("boolean operators", () => {
    it("is_true matches true value", () => {
      const condition = createCondition({
        field: "active",
        dataType: "boolean",
        operator: "is_true",
      });
      expect(evaluateCondition(condition, { active: true })).toBe(true);
    });

    it("is_true returns false for false value", () => {
      const condition = createCondition({
        field: "active",
        dataType: "boolean",
        operator: "is_true",
      });
      expect(evaluateCondition(condition, { active: false })).toBe(false);
    });

    it("is_false matches false value", () => {
      const condition = createCondition({
        field: "disabled",
        dataType: "boolean",
        operator: "is_false",
      });
      expect(evaluateCondition(condition, { disabled: false })).toBe(true);
    });

    it("is_false returns false for true value", () => {
      const condition = createCondition({
        field: "disabled",
        dataType: "boolean",
        operator: "is_false",
      });
      expect(evaluateCondition(condition, { disabled: true })).toBe(false);
    });

    it("coerces truthy values", () => {
      const condition = createCondition({
        field: "value",
        dataType: "boolean",
        operator: "is_true",
      });
      expect(evaluateCondition(condition, { value: 1 })).toBe(true);
      expect(evaluateCondition(condition, { value: "yes" })).toBe(true);
    });

    it("coerces falsy values", () => {
      const condition = createCondition({
        field: "value",
        dataType: "boolean",
        operator: "is_false",
      });
      expect(evaluateCondition(condition, { value: 0 })).toBe(true);
      expect(evaluateCondition(condition, { value: "" })).toBe(true);
    });
  });

  describe("date operators", () => {
    const pastDate = new Date("2020-01-01");
    const futureDate = new Date("2099-12-31");

    it("equals matches same date", () => {
      const targetDate = new Date("2024-06-15T00:00:00Z");
      const condition = createCondition({
        field: "created",
        dataType: "date",
        operator: "equals",
        value: targetDate.toISOString(),
      });
      expect(
        evaluateCondition(condition, { created: targetDate.toISOString() })
      ).toBe(true);
    });

    it("not_equals returns true for different dates", () => {
      const condition = createCondition({
        field: "created",
        dataType: "date",
        operator: "not_equals",
        value: "2024-01-01",
      });
      expect(evaluateCondition(condition, { created: "2024-01-02" })).toBe(
        true
      );
    });

    it("is_before compares dates correctly", () => {
      const condition = createCondition({
        field: "deadline",
        dataType: "date",
        operator: "is_before",
        value: "2024-06-15",
      });
      expect(evaluateCondition(condition, { deadline: "2024-06-14" })).toBe(
        true
      );
      expect(evaluateCondition(condition, { deadline: "2024-06-16" })).toBe(
        false
      );
    });

    it("is_after compares dates correctly", () => {
      const condition = createCondition({
        field: "startDate",
        dataType: "date",
        operator: "is_after",
        value: "2024-01-01",
      });
      expect(evaluateCondition(condition, { startDate: "2024-01-02" })).toBe(
        true
      );
      expect(evaluateCondition(condition, { startDate: "2023-12-31" })).toBe(
        false
      );
    });

    it("is_in_past checks against current time", () => {
      const condition = createCondition({
        field: "date",
        dataType: "date",
        operator: "is_in_past",
      });
      expect(evaluateCondition(condition, { date: pastDate })).toBe(true);
      expect(evaluateCondition(condition, { date: futureDate })).toBe(false);
    });

    it("is_in_future checks against current time", () => {
      const condition = createCondition({
        field: "date",
        dataType: "date",
        operator: "is_in_future",
      });
      expect(evaluateCondition(condition, { date: futureDate })).toBe(true);
      expect(evaluateCondition(condition, { date: pastDate })).toBe(false);
    });

    it("date_between checks inclusive range", () => {
      const condition = createCondition({
        field: "eventDate",
        dataType: "date",
        operator: "date_between",
        value: "2024-01-01",
        secondValue: "2024-12-31",
      });
      expect(evaluateCondition(condition, { eventDate: "2024-06-15" })).toBe(
        true
      );
      expect(evaluateCondition(condition, { eventDate: "2024-01-01" })).toBe(
        true
      );
      expect(evaluateCondition(condition, { eventDate: "2023-12-31" })).toBe(
        false
      );
    });

    it("handles invalid date string", () => {
      const condition = createCondition({
        field: "date",
        dataType: "date",
        operator: "is_in_past",
      });
      expect(evaluateCondition(condition, { date: "not-a-date" })).toBe(false);
    });

    it("handles Date objects", () => {
      const condition = createCondition({
        field: "created",
        dataType: "date",
        operator: "is_in_past",
      });
      expect(
        evaluateCondition(condition, { created: new Date("2020-01-01") })
      ).toBe(true);
    });

    it("handles numeric timestamps", () => {
      const condition = createCondition({
        field: "timestamp",
        dataType: "date",
        operator: "is_in_past",
      });
      expect(
        evaluateCondition(condition, {
          timestamp: new Date("2020-01-01").getTime(),
        })
      ).toBe(true);
    });
  });

  describe("array operators", () => {
    it("array_contains finds element", () => {
      const condition = createCondition({
        field: "tags",
        dataType: "array",
        operator: "array_contains",
        value: "important",
      });
      expect(
        evaluateCondition(condition, { tags: ["urgent", "important", "todo"] })
      ).toBe(true);
    });

    it("array_contains handles numeric values", () => {
      const condition = createCondition({
        field: "ids",
        dataType: "array",
        operator: "array_contains",
        value: "42",
      });
      expect(evaluateCondition(condition, { ids: [1, 42, 99] })).toBe(true);
    });

    it("array_not_contains verifies absence", () => {
      const condition = createCondition({
        field: "roles",
        dataType: "array",
        operator: "array_not_contains",
        value: "admin",
      });
      expect(evaluateCondition(condition, { roles: ["user", "viewer"] })).toBe(
        true
      );
    });

    it("array_length_equals checks exact length", () => {
      const condition = createCondition({
        field: "items",
        dataType: "array",
        operator: "array_length_equals",
        value: 3,
      });
      expect(evaluateCondition(condition, { items: [1, 2, 3] })).toBe(true);
      expect(evaluateCondition(condition, { items: [1, 2] })).toBe(false);
    });

    it("array_length_greater checks minimum", () => {
      const condition = createCondition({
        field: "items",
        dataType: "array",
        operator: "array_length_greater",
        value: 2,
      });
      expect(evaluateCondition(condition, { items: [1, 2, 3] })).toBe(true);
      expect(evaluateCondition(condition, { items: [1, 2] })).toBe(false);
    });

    it("array_length_less checks maximum", () => {
      const condition = createCondition({
        field: "items",
        dataType: "array",
        operator: "array_length_less",
        value: 3,
      });
      expect(evaluateCondition(condition, { items: [1, 2] })).toBe(true);
      expect(evaluateCondition(condition, { items: [1, 2, 3] })).toBe(false);
    });

    it("array_is_empty checks for empty array", () => {
      const condition = createCondition({
        field: "items",
        dataType: "array",
        operator: "array_is_empty",
      });
      expect(evaluateCondition(condition, { items: [] })).toBe(true);
      expect(evaluateCondition(condition, { items: [1] })).toBe(false);
    });

    it("array_is_empty returns true for non-array", () => {
      const condition = createCondition({
        field: "items",
        dataType: "array",
        operator: "array_is_empty",
      });
      expect(evaluateCondition(condition, { items: null })).toBe(true);
      expect(evaluateCondition(condition, { items: "string" })).toBe(true);
    });
  });

  describe("object operators", () => {
    it("has_key checks for property existence", () => {
      const condition = createCondition({
        field: "metadata",
        dataType: "object",
        operator: "has_key",
        value: "version",
      });
      expect(
        evaluateCondition(condition, { metadata: { version: "1.0" } })
      ).toBe(true);
      expect(evaluateCondition(condition, { metadata: { name: "test" } })).toBe(
        false
      );
    });

    it("key_equals checks property value", () => {
      const condition = createCondition({
        field: "config",
        dataType: "object",
        operator: "key_equals",
        value: "enabled",
      });
      expect(evaluateCondition(condition, { config: { enabled: true } })).toBe(
        true
      );
      expect(evaluateCondition(condition, { config: {} })).toBe(false);
    });

    it("is_empty checks for empty object", () => {
      const condition = createCondition({
        field: "data",
        dataType: "object",
        operator: "is_empty",
      });
      expect(evaluateCondition(condition, { data: {} })).toBe(true);
      expect(evaluateCondition(condition, { data: { key: "value" } })).toBe(
        false
      );
    });

    it("is_not_empty checks for non-empty object", () => {
      const condition = createCondition({
        field: "data",
        dataType: "object",
        operator: "is_not_empty",
      });
      expect(evaluateCondition(condition, { data: { key: "value" } })).toBe(
        true
      );
      expect(evaluateCondition(condition, { data: {} })).toBe(false);
    });

    it("handles null as empty", () => {
      const condition = createCondition({
        field: "obj",
        dataType: "object",
        operator: "is_empty",
      });
      expect(evaluateCondition(condition, { obj: null })).toBe(true);
    });

    it("handles arrays as non-objects", () => {
      const condition = createCondition({
        field: "data",
        dataType: "object",
        operator: "is_empty",
      });
      expect(evaluateCondition(condition, { data: [1, 2, 3] })).toBe(true);
    });
  });

  describe("nested field access", () => {
    it("accesses deeply nested fields", () => {
      const condition = createCondition({
        field: "user.profile.name",
        dataType: "string",
        operator: "equals",
        value: "John",
      });
      const data = {
        user: {
          profile: {
            name: "John",
          },
        },
      };
      expect(evaluateCondition(condition, data)).toBe(true);
    });

    it("handles missing intermediate paths", () => {
      const condition = createCondition({
        field: "user.profile.name",
        dataType: "string",
        operator: "exists",
      });
      expect(evaluateCondition(condition, { user: {} })).toBe(false);
      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it("handles null in path", () => {
      const condition = createCondition({
        field: "user.profile.name",
        dataType: "string",
        operator: "exists",
      });
      expect(evaluateCondition(condition, { user: null })).toBe(false);
    });
  });
});

describe("evaluateGroup", () => {
  it("returns true for empty group", () => {
    const group = createGroup([]);
    expect(evaluateGroup(group, {})).toBe(true);
  });

  it("AND logic requires all conditions true", () => {
    const conditions = [
      createCondition({ id: "c1", field: "a", operator: "equals", value: "1" }),
      createCondition({ id: "c2", field: "b", operator: "equals", value: "2" }),
    ];
    const group = createGroup(conditions, "and");

    expect(evaluateGroup(group, { a: "1", b: "2" })).toBe(true);
    expect(evaluateGroup(group, { a: "1", b: "3" })).toBe(false);
    expect(evaluateGroup(group, { a: "0", b: "2" })).toBe(false);
  });

  it("OR logic requires at least one condition true", () => {
    const conditions = [
      createCondition({ id: "c1", field: "a", operator: "equals", value: "1" }),
      createCondition({ id: "c2", field: "b", operator: "equals", value: "2" }),
    ];
    const group = createGroup(conditions, "or");

    expect(evaluateGroup(group, { a: "1", b: "2" })).toBe(true);
    expect(evaluateGroup(group, { a: "1", b: "3" })).toBe(true);
    expect(evaluateGroup(group, { a: "0", b: "2" })).toBe(true);
    expect(evaluateGroup(group, { a: "0", b: "3" })).toBe(false);
  });
});

describe("evaluateBranch", () => {
  it("returns true for empty branch (catch-all behavior)", () => {
    const branch = createBranch([]);
    expect(evaluateBranch(branch, {})).toBe(true);
  });

  it("uses OR logic across groups", () => {
    const group1 = createGroup(
      [
        createCondition({
          id: "c1",
          field: "type",
          operator: "equals",
          value: "A",
        }),
      ],
      "and"
    );
    const group2 = createGroup(
      [
        createCondition({
          id: "c2",
          field: "type",
          operator: "equals",
          value: "B",
        }),
      ],
      "and"
    );
    const branch = createBranch([group1, group2]);

    expect(evaluateBranch(branch, { type: "A" })).toBe(true);
    expect(evaluateBranch(branch, { type: "B" })).toBe(true);
    expect(evaluateBranch(branch, { type: "C" })).toBe(false);
  });

  it("all conditions in group must match (AND)", () => {
    const group = createGroup(
      [
        createCondition({
          id: "c1",
          field: "status",
          operator: "equals",
          value: "active",
        }),
        createCondition({
          id: "c2",
          field: "role",
          operator: "equals",
          value: "admin",
        }),
      ],
      "and"
    );
    const branch = createBranch([group]);

    expect(evaluateBranch(branch, { status: "active", role: "admin" })).toBe(
      true
    );
    expect(evaluateBranch(branch, { status: "active", role: "user" })).toBe(
      false
    );
  });
});

describe("evaluateBranches", () => {
  it("returns first matching branch id", () => {
    const branches: ConditionBranch[] = [
      createBranch(
        [
          createGroup([
            createCondition({
              id: "c1",
              field: "priority",
              operator: "equals",
              value: "high",
            }),
          ]),
        ],
        "High Priority",
        "branch-high"
      ),
      createBranch(
        [
          createGroup([
            createCondition({
              id: "c2",
              field: "priority",
              operator: "equals",
              value: "low",
            }),
          ]),
        ],
        "Low Priority",
        "branch-low"
      ),
    ];

    expect(evaluateBranches(branches, { priority: "high" })).toBe(
      "branch-high"
    );
    expect(evaluateBranches(branches, { priority: "low" })).toBe("branch-low");
  });

  it("returns null when no branch matches", () => {
    const branches: ConditionBranch[] = [
      createBranch(
        [
          createGroup([
            createCondition({
              id: "c1",
              field: "type",
              operator: "equals",
              value: "A",
            }),
          ]),
        ],
        "Type A"
      ),
    ];

    expect(evaluateBranches(branches, { type: "B" })).toBe(null);
  });

  it("returns empty array result as null", () => {
    expect(evaluateBranches([], {})).toBe(null);
  });

  it("evaluates branches in order (first match wins)", () => {
    const branches: ConditionBranch[] = [
      {
        id: "first",
        label: "First",
        groups: [
          createGroup([
            createCondition({
              id: "c1",
              field: "score",
              dataType: "number",
              operator: "greater_than",
              value: 90,
            }),
          ]),
        ],
      },
      {
        id: "second",
        label: "Second",
        groups: [
          createGroup([
            createCondition({
              id: "c2",
              field: "score",
              dataType: "number",
              operator: "greater_than",
              value: 50,
            }),
          ]),
        ],
      },
    ];

    expect(evaluateBranches(branches, { score: 95 })).toBe("first");
    expect(evaluateBranches(branches, { score: 75 })).toBe("second");
    expect(evaluateBranches(branches, { score: 30 })).toBe(null);
  });
});

describe("edge cases", () => {
  it("handles empty field name", () => {
    const condition = createCondition({
      field: "",
      operator: "exists",
    });
    expect(evaluateCondition(condition, { "": "value" })).toBe(false);
  });

  it("handles special characters in field names", () => {
    const condition = createCondition({
      field: "data.user-name",
      operator: "equals",
      value: "test",
    });
    expect(
      evaluateCondition(condition, { data: { "user-name": "test" } })
    ).toBe(true);
  });

  it("handles circular reference safely (no infinite loop)", () => {
    const condition = createCondition({
      field: "self.value",
      operator: "exists",
    });
    const data: Record<string, unknown> = {};
    data.self = data;
    expect(evaluateCondition(condition, data)).toBe(false);
  });

  it("finds value through circular reference", () => {
    const condition = createCondition({
      field: "self.name",
      operator: "exists",
    });
    const data: Record<string, unknown> = { name: "test" };
    data.self = data;
    expect(evaluateCondition(condition, data)).toBe(true);
  });
});
