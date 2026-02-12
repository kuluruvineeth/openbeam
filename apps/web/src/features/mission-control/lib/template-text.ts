export function resolveTemplateText(
  template: string,
  payload: Record<string, unknown> | undefined,
  agentName?: string
): string {
  let result = template;

  if (agentName) {
    result = result.replace("{agentName}", agentName);
  }

  if (payload) {
    for (const [key, value] of Object.entries(payload)) {
      result = result.replace(`{${key}}`, String(value ?? ""));
    }
  }

  return result
    .replace(/\{[^}]+\}/g, "")
    .replace(/\b1 steps\b/g, "1 step")
    .replace(/\b1 tokens\b/g, "1 token");
}
