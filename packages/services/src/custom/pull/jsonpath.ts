export { applyContentTemplate, resolveJsonPath } from "../webhook/transform";

import { resolveJsonPath } from "../webhook/transform";

export function resolveJsonPathArray(data: unknown, path: string): unknown[] {
  if (typeof data !== "object" || data === null) {
    return [];
  }

  const result = resolveJsonPath(data as Record<string, unknown>, path);
  if (Array.isArray(result)) {
    return result;
  }
  if (result !== null && result !== undefined) {
    return [result];
  }
  return [];
}
