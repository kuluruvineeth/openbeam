export function formatDuration(seconds: number | undefined): string | null {
  if (seconds === undefined || seconds <= 0) {
    return null;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export function buildCxoneUrl(
  baseUrl: string,
  entityType: string,
  entityId: number
): string {
  return `${baseUrl}/#/${entityType}/${entityId}`;
}
