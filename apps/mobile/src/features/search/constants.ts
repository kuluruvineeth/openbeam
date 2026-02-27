import type { DateRangeType, SearchRanking } from "./types";

export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_RESULTS_LIMIT = 20;

export const RANKING_OPTIONS: SearchRanking[] = [
  "bm25",
  "semantic",
  "hybrid",
  "hybrid_v2",
  "hybrid_v2_rerank",
  "recency",
  "engagement",
];

export const RANKING_LABELS: Record<SearchRanking, string> = {
  hybrid_v2_rerank: "Hybrid Pro + Rerank",
  hybrid_v2: "Hybrid Pro",
  hybrid: "Hybrid",
  bm25: "Keyword",
  semantic: "Semantic",
  recency: "Recent",
  engagement: "Popular",
};

export const RRF_DEFAULTS = {
  k: 60,
  weightBm25: 0.4,
  weightDense: 0.4,
  weightSparse: 0.2,
} as const;

export const DATE_RANGE_OPTIONS: DateRangeType[] = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "last_90_days",
];

export const DATE_RANGE_LABELS: Record<DateRangeType, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  custom: "Custom",
};

export function getDateRangeTimestamps(dateRange: DateRangeType | null): {
  fromDate?: number;
  toDate?: number;
} {
  if (!dateRange) {
    return {};
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  switch (dateRange) {
    case "today":
      return { fromDate: now - day };
    case "yesterday":
      return { fromDate: now - 2 * day, toDate: now - day };
    case "last_7_days":
      return { fromDate: now - 7 * day };
    case "last_30_days":
      return { fromDate: now - 30 * day };
    case "last_90_days":
      return { fromDate: now - 90 * day };
    default:
      return {};
  }
}

export const DOCUMENT_TYPE_OPTIONS = [
  "message",
  "email",
  "file",
  "document",
  "folder",
  "page",
  "issue",
  "ticket",
  "task",
  "comment",
] as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  message: "Messages",
  email: "Emails",
  file: "Files",
  document: "Documents",
  folder: "Folders",
  page: "Pages",
  issue: "Issues",
  ticket: "Tickets",
  task: "Tasks",
  comment: "Comments",
};

export const SOURCE_TYPE_OPTIONS = [
  "channel",
  "folder",
  "database",
  "repository",
  "board",
  "space",
] as const;

export const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "done",
  "closed",
  "archived",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f97316",
  done: "#22c55e",
  closed: "#6b7280",
  archived: "#9ca3af",
};

export const PRIORITY_OPTIONS = [
  "critical",
  "high",
  "medium",
  "low",
  "none",
] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
  none: "#9ca3af",
};
