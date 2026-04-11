import type { FormField } from "@openbeam/types/bot";

interface ValidationResult {
  ok: boolean;
  hint?: string;
}

export function validateField(
  field: FormField,
  input: string
): ValidationResult {
  const trimmed = input.trim();

  if (field.required && trimmed.length === 0) {
    return { ok: false, hint: `${field.label} is required.` };
  }

  if (!field.required && trimmed.length === 0) {
    return { ok: true };
  }

  if (field.type === "select" && field.options) {
    const match = field.options.find(
      (o) =>
        o.value.toLowerCase() === trimmed.toLowerCase() ||
        o.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (!match) {
      const valid = field.options.map((o) => o.label).join(", ");
      return { ok: false, hint: `Choose one of: ${valid}` };
    }
  }

  if (field.type === "number") {
    const num = Number(trimmed);
    if (Number.isNaN(num)) {
      return { ok: false, hint: "Please enter a valid number." };
    }
    if (field.validate?.min !== undefined && num < field.validate.min) {
      return { ok: false, hint: `Minimum value is ${field.validate.min}.` };
    }
    if (field.validate?.max !== undefined && num > field.validate.max) {
      return { ok: false, hint: `Maximum value is ${field.validate.max}.` };
    }
  }

  if (field.validate?.pattern) {
    const re = new RegExp(field.validate.pattern);
    if (!re.test(trimmed)) {
      return { ok: false, hint: field.validate.errorHint };
    }
  }

  return { ok: true };
}

export function coerceValue(field: FormField, input: string): unknown {
  const trimmed = input.trim();

  if (field.type === "number") {
    return Number(trimmed);
  }

  if (field.type === "boolean") {
    return ["true", "yes", "1", "y"].includes(trimmed.toLowerCase());
  }

  if (field.type === "select" && field.options) {
    const match = field.options.find(
      (o) =>
        o.value.toLowerCase() === trimmed.toLowerCase() ||
        o.label.toLowerCase() === trimmed.toLowerCase()
    );
    return match?.value ?? trimmed;
  }

  return trimmed;
}
