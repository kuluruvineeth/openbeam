import { describe, expect, test } from "bun:test";
import type { FormField } from "@openbeam/types/bot";
import { coerceValue, validateField } from "../form-validator";

const textField: FormField = {
  id: "title",
  label: "Title",
  prompt: "Enter title:",
  type: "text",
  required: true,
};

const selectField: FormField = {
  id: "priority",
  label: "Priority",
  prompt: "Select priority:",
  type: "select",
  required: true,
  options: [
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
  ],
};

const numberField: FormField = {
  id: "count",
  label: "Count",
  prompt: "Enter count:",
  type: "number",
  required: true,
  validate: { min: 1, max: 100, errorHint: "Must be 1-100" },
};

describe("validateField", () => {
  test("required text field rejects empty input", () => {
    const result = validateField(textField, "");
    expect(result.ok).toBe(false);
  });

  test("required text field accepts non-empty", () => {
    expect(validateField(textField, "Bug report").ok).toBe(true);
  });

  test("select field rejects invalid option", () => {
    const result = validateField(selectField, "urgent");
    expect(result.ok).toBe(false);
    expect(result.hint).toContain("High");
  });

  test("select field accepts valid option by label", () => {
    expect(validateField(selectField, "High").ok).toBe(true);
  });

  test("select field accepts valid option by value", () => {
    expect(validateField(selectField, "medium").ok).toBe(true);
  });

  test("number field rejects non-numeric", () => {
    expect(validateField(numberField, "abc").ok).toBe(false);
  });

  test("number field rejects out of range", () => {
    expect(validateField(numberField, "0").ok).toBe(false);
    expect(validateField(numberField, "101").ok).toBe(false);
  });

  test("number field accepts in range", () => {
    expect(validateField(numberField, "50").ok).toBe(true);
  });
});

describe("coerceValue", () => {
  test("coerces number", () => {
    expect(coerceValue(numberField, "42")).toBe(42);
  });

  test("coerces boolean", () => {
    const boolField: FormField = {
      id: "active",
      label: "Active",
      prompt: "Active?",
      type: "boolean",
      required: true,
    };
    expect(coerceValue(boolField, "yes")).toBe(true);
    expect(coerceValue(boolField, "no")).toBe(false);
  });

  test("coerces select to value", () => {
    expect(coerceValue(selectField, "High")).toBe("high");
  });

  test("passes through text", () => {
    expect(coerceValue(textField, "hello")).toBe("hello");
  });
});
