export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildPipedriveUrl(
  companyDomain: string,
  entityType: string,
  entityId: number
): string {
  return `https://${companyDomain}.pipedrive.com/${entityType}/${entityId}`;
}
