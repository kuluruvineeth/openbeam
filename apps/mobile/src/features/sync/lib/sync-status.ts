import type { LucideIcon } from "lucide-react-native";
import { AlertCircle, Check, Clock, Loader2, X } from "lucide-react-native";

export type SyncStatus =
  | "SYNCING"
  | "ACTIVE"
  | "ERROR"
  | "INACTIVE"
  | "CONNECTING"
  | "DELETING";

export type SyncStatusConfig = {
  label: string;
  icon: LucideIcon;
  color: string;
  backgroundColor: string;
  animated: boolean;
};

export const SYNC_STATUS_CONFIG: Record<SyncStatus, SyncStatusConfig> = {
  SYNCING: {
    label: "Syncing",
    icon: Loader2,
    color: "#6b7280",
    backgroundColor: "rgba(107, 114, 128, 0.08)",
    animated: true,
  },
  ACTIVE: {
    label: "Indexed",
    icon: Check,
    color: "#16a34a",
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    animated: false,
  },
  ERROR: {
    label: "Error",
    icon: X,
    color: "#dc2626",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    animated: false,
  },
  INACTIVE: {
    label: "Paused",
    icon: X,
    color: "#9ca3af",
    backgroundColor: "rgba(156, 163, 175, 0.06)",
    animated: false,
  },
  CONNECTING: {
    label: "Connecting",
    icon: Loader2,
    color: "#f97316",
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    animated: true,
  },
  DELETING: {
    label: "Deleting",
    icon: Clock,
    color: "#dc2626",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    animated: false,
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
    icon: Clock,
    color: "#9ca3af",
    backgroundColor: "rgba(156, 163, 175, 0.06)",
    animated: false,
  },
  QUEUED: {
    label: "Queued",
    icon: Clock,
    color: "#9ca3af",
    backgroundColor: "rgba(156, 163, 175, 0.06)",
    animated: false,
  },
  RUNNING: {
    label: "Syncing",
    icon: Loader2,
    color: "#6b7280",
    backgroundColor: "rgba(107, 114, 128, 0.08)",
    animated: true,
  },
  PAUSED: {
    label: "Paused",
    icon: X,
    color: "#9ca3af",
    backgroundColor: "rgba(156, 163, 175, 0.06)",
    animated: false,
  },
  COMPLETED: {
    label: "Success",
    icon: Check,
    color: "#16a34a",
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    animated: false,
  },
  PARTIAL: {
    label: "Partial",
    icon: AlertCircle,
    color: "#f97316",
    backgroundColor: "rgba(249, 115, 22, 0.08)",
    animated: false,
  },
  FAILED: {
    label: "Failed",
    icon: X,
    color: "#dc2626",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    animated: false,
  },
  CANCELLED: {
    label: "Cancelled",
    icon: X,
    color: "#9ca3af",
    backgroundColor: "rgba(156, 163, 175, 0.06)",
    animated: false,
  },
  TIMEOUT: {
    label: "Timeout",
    icon: Clock,
    color: "#dc2626",
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    animated: false,
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
