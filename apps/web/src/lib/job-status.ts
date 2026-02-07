import { Icons } from "@/components/icons";

export type JobType = "sync" | "file" | "media" | "index" | "export";

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type SyncStage =
  | "INITIALIZING"
  | "FETCHING"
  | "TRANSFORMING"
  | "INDEXING"
  | "FINALIZING"
  | "COMPLETED"
  | "FAILED";

export type JobProgress = {
  id: string;
  teamId: string;
  type: JobType;
  status: JobStatus;
  connectorId?: string;
  connectorName?: string;
  fileName?: string;
  progress: number;
  currentPhase?: string;
  currentItem?: string;
  itemsTotal: number;
  itemsProcessed: number;
  itemsFailed: number;
  startedAt: string;
  estimatedTimeRemainingMs?: number;
  error?: string;
};

export type JobStatusConfig = {
  label: string;
  className: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
};

const STATUS_STYLES = {
  active: "bg-foreground/[0.04] text-foreground/70",
  success:
    "bg-openplane-green/10 text-openplane-green dark:text-openplane-green/90",
  error: "bg-destructive/10 text-destructive/90",
  muted: "bg-foreground/[0.03] text-foreground/40",
} as const;

export const JOB_STATUS_CONFIG: Record<JobStatus, JobStatusConfig> = {
  pending: {
    label: "Pending",
    className: STATUS_STYLES.muted,
    icon: Icons.Clock,
    iconClass: "",
  },
  running: {
    label: "Running",
    className: STATUS_STYLES.active,
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  completed: {
    label: "Completed",
    className: STATUS_STYLES.success,
    icon: Icons.CheckIcon,
    iconClass: "",
  },
  failed: {
    label: "Failed",
    className: STATUS_STYLES.error,
    icon: Icons.XIcon,
    iconClass: "",
  },
  cancelled: {
    label: "Cancelled",
    className: STATUS_STYLES.muted,
    icon: Icons.Close,
    iconClass: "",
  },
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  sync: "Syncing",
  file: "Processing",
  media: "Transcribing",
  index: "Indexing",
  export: "Exporting",
};

export function getJobStatusConfig(status: JobStatus): JobStatusConfig {
  return JOB_STATUS_CONFIG[status] ?? JOB_STATUS_CONFIG.running;
}

export function getJobLabel(type: JobType, name?: string): string {
  const prefix = JOB_TYPE_LABELS[type];
  return name ? `${prefix} ${name}` : prefix;
}

export function formatTimeRemaining(ms: number): string {
  if (ms < 60_000) {
    return "<1m";
  }
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) {
    return `~${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return `~${hours}h`;
}
