export function buildJFrogRepoUrl(
  instanceUrl: string,
  repoKey: string
): string {
  return `${instanceUrl}/ui/repos/tree/General/${repoKey}`;
}

export function buildJFrogArtifactUrl(
  instanceUrl: string,
  repo: string,
  path: string,
  name: string
): string {
  const fullPath = path === "." ? name : `${path}/${name}`;
  return `${instanceUrl}/ui/repos/tree/General/${repo}/${fullPath}`;
}

export function buildJFrogBuildUrl(
  instanceUrl: string,
  buildName: string,
  buildNumber: string
): string {
  return `${instanceUrl}/ui/builds/${encodeURIComponent(buildName)}/${encodeURIComponent(buildNumber)}`;
}

export function buildJFrogViolationUrl(
  instanceUrl: string,
  violationId: string
): string {
  return `${instanceUrl}/ui/watchesNew/issueDetails/${violationId}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatSeverity(severity: string): string {
  const map: Record<string, string> = {
    Critical: "Critical",
    High: "High",
    Medium: "Medium",
    Low: "Low",
    Information: "Informational",
  };
  return map[severity] ?? severity;
}
