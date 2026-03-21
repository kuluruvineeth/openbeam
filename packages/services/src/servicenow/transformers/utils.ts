export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function parseServiceNowDate(dateStr: string): number {
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? Date.now() : ts;
}

export function extractDisplayValue(
  field: string | { display_value?: string; value?: string }
): string {
  if (typeof field === "string") {
    return field;
  }
  return field?.display_value ?? field?.value ?? "";
}
