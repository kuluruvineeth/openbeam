import type { Icons } from "@/components/icons";

export const RANKING_OPTIONS = [
  "bm25",
  "semantic",
  "hybrid",
  "hybrid_v2",
  "recency",
  "engagement",
] as const;

export type SearchRanking = (typeof RANKING_OPTIONS)[number];

export const RANKING_CONFIG: Record<
  SearchRanking,
  {
    label: string;
    icon: keyof typeof Icons;
    group: "standard" | "advanced" | "other";
  }
> = {
  hybrid_v2: { label: "Hybrid Pro", icon: "AtomIcon", group: "advanced" },
  hybrid: { label: "Hybrid", icon: "Sparkle", group: "standard" },
  bm25: { label: "Keyword", icon: "Search", group: "standard" },
  semantic: { label: "Semantic", icon: "BrainIcon", group: "standard" },
  recency: { label: "Recent", icon: "Clock", group: "other" },
  engagement: { label: "Popular", icon: "Heart", group: "other" },
};

export const RRF_DEFAULTS = {
  k: 60,
  weightBm25: 0.4,
  weightDense: 0.4,
  weightSparse: 0.2,
} as const;

export const DATE_RANGE_OPTIONS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "custom",
] as const;

export type DateRangeType = (typeof DATE_RANGE_OPTIONS)[number];

export const DATE_RANGE_CONFIG: Record<DateRangeType, string> = {
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

export type DocumentType = (typeof DOCUMENT_TYPE_OPTIONS)[number];

export const DOCUMENT_TYPE_CONFIG: Record<
  DocumentType,
  { label: string; icon: keyof typeof Icons }
> = {
  message: { label: "Messages", icon: "Message" },
  email: { label: "Emails", icon: "Mail" },
  file: { label: "Files", icon: "FileIcon" },
  document: { label: "Documents", icon: "FileTextIcon" },
  folder: { label: "Folders", icon: "Folder" },
  page: { label: "Pages", icon: "FileTextIcon" },
  issue: { label: "Issues", icon: "AlertCircle" },
  ticket: { label: "Tickets", icon: "AlertCircle" },
  task: { label: "Tasks", icon: "Task" },
  comment: { label: "Comments", icon: "Comment" },
};

export const SOURCE_TYPE_OPTIONS = [
  "channel",
  "folder",
  "database",
  "repository",
  "board",
  "space",
] as const;

export type SourceType = (typeof SOURCE_TYPE_OPTIONS)[number];

export const SOURCE_TYPE_CONFIG: Record<SourceType, string> = {
  channel: "Channels",
  folder: "Folders",
  database: "Databases",
  repository: "Repositories",
  board: "Boards",
  space: "Spaces",
};

export const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "done",
  "closed",
  "archived",
] as const;

export type StatusType = (typeof STATUS_OPTIONS)[number];

export const STATUS_CONFIG: Record<
  StatusType,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "bg-openplane-blue/15 text-openplane-blue" },
  in_progress: {
    label: "In Progress",
    color: "bg-openplane-orange/15 text-openplane-orange",
  },
  done: { label: "Done", color: "bg-openplane-green/15 text-openplane-green" },
  closed: { label: "Closed", color: "bg-foreground/10 text-foreground/60" },
  archived: { label: "Archived", color: "bg-foreground/5 text-foreground/40" },
};

export const PRIORITY_OPTIONS = [
  "critical",
  "high",
  "medium",
  "low",
  "none",
] as const;

export type PriorityType = (typeof PRIORITY_OPTIONS)[number];

export const PRIORITY_CONFIG: Record<
  PriorityType,
  { label: string; color: string }
> = {
  critical: {
    label: "Critical",
    color: "bg-destructive/15 text-destructive",
  },
  high: {
    label: "High",
    color: "bg-openplane-orange/15 text-openplane-orange",
  },
  medium: {
    label: "Medium",
    color: "bg-openplane-blue/15 text-openplane-blue",
  },
  low: { label: "Low", color: "bg-foreground/10 text-foreground/60" },
  none: { label: "None", color: "bg-foreground/5 text-foreground/40" },
};

export const MEDIA_TYPE_OPTIONS = [
  "meeting",
  "presentation",
  "tutorial",
  "demo",
  "interview",
  "webinar",
  "other",
] as const;

export type MediaTypeOption = (typeof MEDIA_TYPE_OPTIONS)[number];

export const MEDIA_TYPE_CONFIG: Record<
  MediaTypeOption,
  { label: string; color: string }
> = {
  meeting: {
    label: "Meeting",
    color: "bg-openplane-blue/10 text-openplane-blue",
  },
  presentation: {
    label: "Presentation",
    color: "bg-openplane-orange/10 text-openplane-orange",
  },
  tutorial: {
    label: "Tutorial",
    color: "bg-openplane-green/10 text-openplane-green",
  },
  demo: {
    label: "Demo",
    color: "bg-openplane-pink/10 text-openplane-pink",
  },
  interview: {
    label: "Interview",
    color: "bg-openplane-yellow/10 text-openplane-yellow",
  },
  webinar: {
    label: "Webinar",
    color: "bg-openplane-blue/10 text-openplane-blue",
  },
  other: {
    label: "Other",
    color: "bg-foreground/5 text-foreground/60",
  },
};
