export function buildBenchlingUrl(tenant: string, path: string): string {
  return `https://${tenant}.benchling.com${path}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatFieldsAsContent(
  fields: Record<string, { value: unknown; displayValue?: string }>
): string {
  const parts: string[] = [];
  for (const [key, field] of Object.entries(fields)) {
    const display = field.displayValue ?? String(field.value ?? "");
    if (display) {
      parts.push(`${key}: ${display}`);
    }
  }
  return parts.join("\n");
}
