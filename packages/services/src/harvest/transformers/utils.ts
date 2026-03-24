export function buildHarvestUrl(
  accountId: string,
  entityType: string,
  entityId: number
): string {
  return `https://${accountId}.harvestapp.com/${entityType}/${entityId}`;
}
