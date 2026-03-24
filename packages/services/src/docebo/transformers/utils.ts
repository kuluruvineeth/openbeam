export function buildDoceboUrl(
  instanceUrl: string,
  entityType: string,
  entityId: number
): string {
  return `${instanceUrl}/${entityType}/${entityId}`;
}
