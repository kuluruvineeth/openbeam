export function buildCoupaUrl(
  instanceUrl: string,
  entityType: string,
  entityId: number
): string {
  return `${instanceUrl}/${entityType}/${entityId}`;
}

export function formatCoupaAddress(
  address:
    | {
        street1?: string;
        city?: string;
        state?: string;
        "postal-code"?: string;
        country?: { code?: string };
      }
    | undefined
): string | null {
  if (!address) {
    return null;
  }
  const parts = [
    address.street1,
    address.city,
    address.state,
    address["postal-code"],
    address.country?.code,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
