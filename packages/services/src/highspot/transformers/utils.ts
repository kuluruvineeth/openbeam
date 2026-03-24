export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildHighspotUrl(domain: string, entityId: string): string {
  return `https://${domain}/items/${entityId}`;
}

export function resolveDocumentType(
  itemType: string,
  mimeType: string | null
): string {
  const lower = itemType.toLowerCase();
  if (lower.includes("video") || mimeType?.startsWith("video/")) {
    return "video";
  }
  if (
    lower.includes("presentation") ||
    lower.includes("slide") ||
    mimeType?.includes("presentation")
  ) {
    return "presentation";
  }
  return "document";
}
