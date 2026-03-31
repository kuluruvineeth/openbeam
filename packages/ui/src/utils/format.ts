import { format, isToday, isYesterday } from "date-fns";

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

export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return "?";
  }
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

export function formatCalendarTime(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 7) {
    return format(date, "EEE");
  }

  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "MMM d");
  }

  return format(date, "MMM d, yyyy");
}

export function formatFullTime(timestamp: number): string {
  return format(new Date(timestamp), "EEEE, MMMM d, yyyy 'at' h:mm a");
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

export function formatFileSize(bytes?: number): string {
  if (!bytes) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getContentPreview(content: string, maxLength = 180): string {
  const cleaned = content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/<@\w+>/g, "@user")
    .replace(/<#\w+\|([^>]+)>/g, "#$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}\u2026`;
  }
  return `${truncated}\u2026`;
}
