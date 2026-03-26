export function buildProcoreUrl(
  projectId: number,
  entityType: string,
  entityId: number
): string {
  return `https://app.procore.com/projects/${projectId}/${entityType}/${entityId}`;
}

export function buildProjectUrl(projectId: number): string {
  return `https://app.procore.com/projects/${projectId}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatAddress(parts: {
  address?: string | null;
  city?: string | null;
  stateCode?: string | null;
  zip?: string | null;
  countryCode?: string | null;
}): string | null {
  const segments = [
    parts.address,
    parts.city,
    parts.stateCode,
    parts.zip,
    parts.countryCode,
  ].filter(Boolean);
  return segments.length > 0 ? segments.join(", ") : null;
}
