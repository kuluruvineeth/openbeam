const BUILD_RESULT_LABELS: Record<string, string> = {
  SUCCESS: "Success",
  FAILURE: "Failure",
  UNSTABLE: "Unstable",
  ABORTED: "Aborted",
  NOT_BUILT: "Not Built",
};

export function formatBuildResult(result: string | null): string {
  if (!result) {
    return "In Progress";
  }
  return BUILD_RESULT_LABELS[result] ?? result;
}

const COLOR_STATUS_MAP: Record<string, string> = {
  blue: "Stable",
  blue_anime: "Building (Stable)",
  yellow: "Unstable",
  yellow_anime: "Building (Unstable)",
  red: "Failed",
  red_anime: "Building (Failed)",
  grey: "Pending",
  disabled: "Disabled",
  aborted: "Aborted",
  notbuilt: "Not Built",
};

export function formatJobStatus(color: string): string {
  return COLOR_STATUS_MAP[color] ?? color;
}

export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
