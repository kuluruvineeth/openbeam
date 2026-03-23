export function buildCodaDocUrl(docId: string): string {
  return `https://coda.io/d/_d${docId}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatRowValues(values: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(values)) {
    if (val === null || val === undefined || val === "") {
      continue;
    }
    const formatted =
      typeof val === "object" ? JSON.stringify(val) : String(val);
    parts.push(`${key}: ${formatted}`);
  }
  return parts.join("\n");
}
