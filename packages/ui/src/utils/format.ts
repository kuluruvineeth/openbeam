export function formatDuration(ms: number): string {
  if (ms >= 3_600_000) {
    return `${Math.round(ms / 3_600_000)}h`;
  }
  if (ms >= 60_000) {
    return `${Math.round(ms / 60_000)}m`;
  }
  return `${Math.round(ms / 1000)}s`;
}

export function formatDurationPrecise(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function normalizeConnectorType(type: string): string {
  return type.replace(/-/g, "_");
}

const TRAILING_ZERO_RE = /\.0$/;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export function formatRelativeTime(date: string | Date | null): string {
  if (!date) {
    return "Never";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();

  if (diff < MINUTE_MS) {
    return "Just now";
  }
  if (diff < HOUR_MS) {
    return `${Math.floor(diff / MINUTE_MS)}m ago`;
  }
  if (diff < DAY_MS) {
    return `${Math.floor(diff / HOUR_MS)}h ago`;
  }
  if (diff < MONTH_MS) {
    return `${Math.floor(diff / DAY_MS)}d ago`;
  }
  if (diff < YEAR_MS) {
    return `${Math.floor(diff / MONTH_MS)}mo ago`;
  }
  return `${Math.floor(diff / YEAR_MS)}y ago`;
}

export function formatRelativeDate(date: string | Date | null): string {
  if (!date) {
    return "";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < DAY_MS && d.getDate() === now.getDate()) {
    return "today";
  }
  if (diff < 2 * DAY_MS) {
    return "yesterday";
  }
  if (diff < 7 * DAY_MS) {
    return `${Math.floor(diff / DAY_MS)}d ago`;
  }
  if (diff < MONTH_MS) {
    return `${Math.floor(diff / (7 * DAY_MS))}w ago`;
  }
  if (diff < YEAR_MS) {
    return `${Math.floor(diff / MONTH_MS)}mo ago`;
  }
  return `${Math.floor(diff / YEAR_MS)}y ago`;
}

export function formatDate(date: string | Date | null): string {
  if (!date) {
    return "";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(TRAILING_ZERO_RE, "")}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(TRAILING_ZERO_RE, "")}K`;
  }
  return String(n);
}
