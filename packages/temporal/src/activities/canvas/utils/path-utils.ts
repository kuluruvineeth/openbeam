import { isRecord } from "./type-guards";

export function getPathValue(value: unknown, path: string): unknown {
  if (!path) {
    return;
  }
  const parts = path.split(".").filter(Boolean);
  let current: unknown = value;
  for (const part of parts) {
    if (!isRecord(current)) {
      return;
    }
    current = current[part];
  }
  return current;
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (isRecord(value)) {
    return Object.keys(value).length === 0;
  }
  return false;
}
