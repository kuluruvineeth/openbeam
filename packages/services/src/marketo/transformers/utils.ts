export function buildMarketoUrl(
  munchkinId: string,
  entityType: string,
  entityId: number
): string {
  return `https://app-${munchkinId}.marketo.com/#${entityType}${entityId}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatName(
  firstName: string | null,
  lastName: string | null
): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}
