export function hasConfig(
  data: unknown
): data is { config?: Record<string, unknown> } {
  return typeof data === "object" && data !== null;
}

export function hasLabel(data: unknown): data is { label?: string } {
  return typeof data === "object" && data !== null;
}

export function hasStringConfig<K extends string>(
  data: unknown,
  key: K
): data is { config: Record<K, string> } {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.config !== "object" || obj.config === null) {
    return false;
  }
  const config = obj.config as Record<string, unknown>;
  return typeof config[key] === "string";
}
