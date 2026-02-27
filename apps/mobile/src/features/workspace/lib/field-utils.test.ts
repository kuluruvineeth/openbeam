import { describe, expect, it } from "vitest";
import {
  formatFieldValue,
  getFieldDisplayName,
  isNumericField,
} from "./field-utils";

describe("getFieldDisplayName", () => {
  it("returns display name for each field type", () => {
    expect(getFieldDisplayName("text")).toBe("Text");
    expect(getFieldDisplayName("email")).toBe("Email");
    expect(getFieldDisplayName("number")).toBe("Number");
    expect(getFieldDisplayName("boolean")).toBe("Boolean");
    expect(getFieldDisplayName("multi_enum")).toBe("Multi Select");
    expect(getFieldDisplayName("richtext")).toBe("Rich Text");
    expect(getFieldDisplayName("datetime")).toBe("Date & Time");
  });
});

describe("formatFieldValue", () => {
  it("returns dash for null or undefined", () => {
    expect(formatFieldValue(null, "text")).toBe("—");
    expect(formatFieldValue(undefined, "text")).toBe("—");
  });

  it("formats boolean values", () => {
    expect(formatFieldValue(true, "boolean")).toBe("Yes");
    expect(formatFieldValue(false, "boolean")).toBe("No");
  });

  it("formats currency values", () => {
    expect(formatFieldValue(1234.56, "currency")).toBe("$1,234.56");
    expect(formatFieldValue(0, "currency")).toBe("$0.00");
  });

  it("formats percent values", () => {
    expect(formatFieldValue(0.75, "percent")).toBe("75.0%");
    expect(formatFieldValue(1, "percent")).toBe("100.0%");
  });

  it("formats multi_enum as comma-separated", () => {
    expect(formatFieldValue(["a", "b", "c"], "multi_enum")).toBe("a, b, c");
    expect(formatFieldValue([], "multi_enum")).toBe("");
  });

  it("stringifies non-array multi_enum", () => {
    expect(formatFieldValue("single", "multi_enum")).toBe("single");
  });

  it("returns string for text fields", () => {
    expect(formatFieldValue("hello", "text")).toBe("hello");
    expect(formatFieldValue(42, "number")).toBe("42");
  });
});

describe("isNumericField", () => {
  it("returns true for numeric types", () => {
    expect(isNumericField("number")).toBe(true);
    expect(isNumericField("currency")).toBe(true);
    expect(isNumericField("percent")).toBe(true);
  });

  it("returns false for non-numeric types", () => {
    expect(isNumericField("text")).toBe(false);
    expect(isNumericField("boolean")).toBe(false);
    expect(isNumericField("enum")).toBe(false);
    expect(isNumericField("date")).toBe(false);
  });
});
