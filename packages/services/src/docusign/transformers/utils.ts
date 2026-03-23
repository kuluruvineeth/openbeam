export function buildDocuSignUrl(
  baseUri: string,
  _accountId: string,
  entityType: string,
  entityId: string
): string {
  const appBaseUrl = baseUri
    .replace("//na", "//app.na")
    .replace("//eu", "//app.eu");
  switch (entityType) {
    case "envelope":
      return `${appBaseUrl}/documents/details/${entityId}`;
    case "template":
      return `${appBaseUrl}/templates/details/${entityId}`;
    default:
      return `${appBaseUrl}/documents`;
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
