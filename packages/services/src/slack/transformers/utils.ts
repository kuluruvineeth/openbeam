import type { JsonObject, JsonValue } from "@openbeam/vespa";

export function filterUndefined(obj: Record<string, unknown>): JsonObject {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value as JsonValue;
    }
  }
  return result;
}
