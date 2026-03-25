export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function flattenAttributes(attrs: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) {
      continue;
    }
    const formatted =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    if (formatted) {
      parts.push(`${key}: ${formatted}`);
    }
  }
  return parts.join("\n");
}
