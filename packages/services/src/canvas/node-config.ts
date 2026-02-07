export function resolveNodeConfig(rawNodeData: unknown): unknown {
  if (rawNodeData && typeof rawNodeData === "object") {
    const record = rawNodeData as Record<string, unknown>;
    if ("config" in record) {
      return record.config;
    }
  }

  return rawNodeData;
}
