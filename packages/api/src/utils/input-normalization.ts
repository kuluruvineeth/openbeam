import type { InputNodeConfig } from "@openplane/types/canvas";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PATTERN_INPUT_LENGTH = 10_000;

const REDOS_PATTERNS = [
  /\([^)]*[+*?][^)]*\)[+*?{]/,
  /(?:\.\*){2,}/,
  /\((?:[^)]*\|){5,}[^)]*\)/,
  /\[\^[^\]]*\]\+/,
];

function isUnsafeRegexPattern(pattern: string): boolean {
  return REDOS_PATTERNS.some((p) => p.test(pattern));
}

type InputFieldConfig = InputNodeConfig["fields"][number];

export function resolveNodeConfig(data: unknown): unknown {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if ("config" in record) {
      return record.config;
    }
  }
  return data;
}

function isBlankValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function normalizeNumberValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  errors.push(`Field ${fieldId} must be a number`);
  return;
}

function normalizeBooleanValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  errors.push(`Field ${fieldId} must be a boolean`);
  return;
}

function normalizeMultiSelectValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): string[] | undefined {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : undefined))
      .filter((entry): entry is string => Boolean(entry));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  errors.push(`Field ${fieldId} must be a list`);
  return;
}

function normalizeSelectValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  errors.push(`Field ${fieldId} must be a string`);
  return;
}

function normalizeEmailValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): string | undefined {
  if (typeof value !== "string" || !EMAIL_PATTERN.test(value)) {
    errors.push(`Field ${fieldId} must be an email`);
    return;
  }
  return value;
}

const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:"]);

function normalizeUrlValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): string | undefined {
  if (typeof value !== "string") {
    errors.push(`Field ${fieldId} must be a URL`);
    return;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    errors.push(`Field ${fieldId} must be a URL`);
    return;
  }
  if (!ALLOWED_URL_PROTOCOLS.has(url.protocol)) {
    errors.push(`Field ${fieldId} must use http or https protocol`);
    return;
  }
  return value;
}

function normalizeDateValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): string | number | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    errors.push(`Field ${fieldId} must be a date`);
    return;
  }
  const parsed = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(parsed)) {
    errors.push(`Field ${fieldId} must be a date`);
    return;
  }
  return value;
}

type FileReference =
  | string
  | {
      url?: string;
      path?: string;
      name?: string;
      size?: number;
      type?: string;
    };

function normalizeFileValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): FileReference | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    ("url" in value || "path" in value)
  ) {
    return value as FileReference;
  }
  errors.push(`Field ${fieldId} must be a file reference`);
  return;
}

function normalizeStringValue(
  fieldId: string,
  value: unknown,
  errors: string[]
): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  errors.push(`Field ${fieldId} must be a string`);
  return;
}

export function normalizeInputValues(
  config: InputNodeConfig,
  rawValues: Record<string, unknown>
): { values: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const values: Record<string, unknown> = {};
  const allowedFields = new Set(config.fields.map((field) => field.id));

  for (const key of Object.keys(rawValues)) {
    if (!allowedFields.has(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  const normalizeFieldValue = (field: InputFieldConfig, value: unknown) => {
    switch (field.type) {
      case "number":
        return normalizeNumberValue(field.id, value, errors);
      case "boolean":
        return normalizeBooleanValue(field.id, value, errors);
      case "multiselect":
        return normalizeMultiSelectValue(field.id, value, errors);
      case "select":
        return normalizeSelectValue(field.id, value, errors);
      case "email":
        return normalizeEmailValue(field.id, value, errors);
      case "url":
        return normalizeUrlValue(field.id, value, errors);
      case "date":
        return normalizeDateValue(field.id, value, errors);
      case "file":
        return normalizeFileValue(field.id, value, errors);
      default:
        return normalizeStringValue(field.id, value, errors);
    }
  };

  for (const field of config.fields) {
    let value = rawValues[field.id];

    if (isBlankValue(value) && field.defaultValue !== undefined) {
      value = field.defaultValue;
    }

    if (isBlankValue(value)) {
      if (field.validation?.required) {
        errors.push(`Missing required field: ${field.id}`);
      }
      continue;
    }

    const normalized = normalizeFieldValue(field, value);
    if (normalized === undefined) {
      continue;
    }

    if (field.options && field.options.length > 0) {
      const allowed = new Set(field.options.map((option) => option.value));
      if (field.type === "multiselect") {
        const selected = Array.isArray(normalized) ? normalized : [];
        for (const item of selected) {
          if (!allowed.has(item)) {
            errors.push(`Field ${field.id} has invalid option`);
            break;
          }
        }
      } else if (typeof normalized === "string" && !allowed.has(normalized)) {
        errors.push(`Field ${field.id} has invalid option`);
      }
    }

    if (typeof normalized === "string") {
      if (
        field.validation?.minLength !== undefined &&
        normalized.length < field.validation.minLength
      ) {
        errors.push(`Field ${field.id} is too short`);
      }
      if (
        field.validation?.maxLength !== undefined &&
        normalized.length > field.validation.maxLength
      ) {
        errors.push(`Field ${field.id} is too long`);
      }
      if (field.validation?.pattern) {
        const pattern = field.validation.pattern;
        if (isUnsafeRegexPattern(pattern)) {
          errors.push(`Field ${field.id} has unsafe pattern`);
        } else if (normalized.length > MAX_PATTERN_INPUT_LENGTH) {
          errors.push(
            `Field ${field.id} input too long for pattern validation`
          );
        } else {
          try {
            const regex = new RegExp(pattern);
            if (!regex.test(normalized)) {
              errors.push(`Field ${field.id} is invalid`);
            }
          } catch {
            errors.push(`Field ${field.id} has invalid pattern`);
          }
        }
      }
    }

    if (typeof normalized === "number") {
      if (
        field.validation?.min !== undefined &&
        normalized < field.validation.min
      ) {
        errors.push(`Field ${field.id} is too small`);
      }
      if (
        field.validation?.max !== undefined &&
        normalized > field.validation.max
      ) {
        errors.push(`Field ${field.id} is too large`);
      }
    }

    values[field.id] = normalized;
  }

  return { values, errors };
}
