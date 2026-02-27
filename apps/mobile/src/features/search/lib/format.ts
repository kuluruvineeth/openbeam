const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) {
    return "";
  }

  const diff = Date.now() - timestamp;

  if (diff < MINUTE) {
    return "now";
  }
  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)}m`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)}h`;
  }
  if (diff < WEEK) {
    return `${Math.floor(diff / DAY)}d`;
  }
  if (diff < MONTH) {
    return `${Math.floor(diff / WEEK)}w`;
  }
  if (diff < YEAR) {
    return `${Math.floor(diff / MONTH)}mo`;
  }
  return `${Math.floor(diff / YEAR)}y`;
}

export function formatFullTime(timestamp: number | undefined): string {
  if (!timestamp) {
    return "";
  }
  return new Date(timestamp).toLocaleString();
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
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

const HTML_TAG_REGEX = /<[^>]*>/g;
const WHITESPACE_REGEX = /\s+/g;

export function stripHtmlTags(html: string): string {
  return html
    .replace(HTML_TAG_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

export function getContentPreview(content: string, maxLength = 160): string {
  const clean = stripHtmlTags(content);
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength)}...`;
}

export function getInitials(name: string): string {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase();
}
