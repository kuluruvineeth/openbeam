import { Icons } from "@/components/icons";

export type SyncStatus =
  | "SYNCING"
  | "ACTIVE"
  | "ERROR"
  | "INACTIVE"
  | "CONNECTING"
  | "DELETING";

export type SyncStatusConfig = {
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
  warning:
    "bg-openplane-orange/10 text-openplane-orange dark:text-openplane-orange/90",
  muted: "bg-foreground/[0.03] text-foreground/40",
} as const;

export const SYNC_STATUS_CONFIG: Record<SyncStatus, SyncStatusConfig> = {
  SYNCING: {
    label: "Syncing",
    className: STATUS_STYLES.active,
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  ACTIVE: {
    label: "Indexed",
    className: STATUS_STYLES.success,
    icon: Icons.CheckIcon,
    iconClass: "",
  },
  ERROR: {
    label: "Error",
    className: STATUS_STYLES.error,
    icon: Icons.XIcon,
    iconClass: "",
  },
  INACTIVE: {
    label: "Paused",
    className: STATUS_STYLES.muted,
    icon: Icons.Close,
    iconClass: "",
  },
  CONNECTING: {
    label: "Connecting",
    className: STATUS_STYLES.warning,
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  DELETING: {
    label: "Deleting",
    className: STATUS_STYLES.error,
    icon: Icons.Clock,
    iconClass: "",
  },
};

export type SyncHistoryStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMEOUT"
  | "PARTIAL";

export const SYNC_HISTORY_STATUS_CONFIG: Record<
  SyncHistoryStatus,
  SyncStatusConfig
> = {
  PENDING: {
    label: "Pending",
    className: STATUS_STYLES.muted,
    icon: Icons.Clock,
    iconClass: "",
  },
  QUEUED: {
    label: "Queued",
    className: STATUS_STYLES.muted,
    icon: Icons.Clock,
    iconClass: "",
  },
  RUNNING: {
    label: "Syncing",
    className: STATUS_STYLES.active,
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  PAUSED: {
    label: "Paused",
    className: STATUS_STYLES.muted,
    icon: Icons.Close,
    iconClass: "",
  },
  COMPLETED: {
    label: "Success",
    className: STATUS_STYLES.success,
    icon: Icons.CheckIcon,
    iconClass: "",
  },
  PARTIAL: {
    label: "Partial",
    className: STATUS_STYLES.warning,
    icon: Icons.AlertCircle,
    iconClass: "",
  },
  FAILED: {
    label: "Failed",
    className: STATUS_STYLES.error,
    icon: Icons.XIcon,
    iconClass: "",
  },
  CANCELLED: {
    label: "Cancelled",
    className: STATUS_STYLES.muted,
    icon: Icons.XIcon,
    iconClass: "",
  },
  TIMEOUT: {
    label: "Timeout",
    className: STATUS_STYLES.error,
    icon: Icons.Clock,
    iconClass: "",
  },
};

export function getSyncStatusConfig(
  status: string | null | undefined
): SyncStatusConfig {
  return (
    SYNC_STATUS_CONFIG[(status ?? "ACTIVE") as SyncStatus] ??
    SYNC_STATUS_CONFIG.ACTIVE
  );
}

export function getSyncHistoryStatusConfig(
  status: string | null | undefined,
  errorMessage?: string | null
): SyncStatusConfig {
  if (status === "COMPLETED" && errorMessage) {
    return SYNC_HISTORY_STATUS_CONFIG.PARTIAL;
  }

  return (
    SYNC_HISTORY_STATUS_CONFIG[(status ?? "COMPLETED") as SyncHistoryStatus] ??
    SYNC_HISTORY_STATUS_CONFIG.COMPLETED
  );
}

export function isSyncingStatus(status: string | null | undefined): boolean {
  return status === "RUNNING" || status === "SYNCING";
}
