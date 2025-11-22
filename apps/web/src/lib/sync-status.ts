import { Icons } from "@/components/icons";

export type SyncStatus =
  | "SYNCING"
  | "ACTIVE"
  | "ERROR"
  | "INACTIVE"
  | "CONNECTING";

export type SyncStatusConfig = {
  label: string;
  className: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
};

export const SYNC_STATUS_CONFIG: Record<SyncStatus, SyncStatusConfig> = {
  SYNCING: {
    label: "Syncing",
    className:
      "bg-blue-100 px-3 py-1 font-mono text-[10px] text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  ACTIVE: {
    label: "Active",
    className:
      "bg-green-100 px-3 py-1 font-mono text-[10px] text-green-600 dark:bg-green-900 dark:text-green-300",
    icon: Icons.CheckIcon,
    iconClass: "",
  },
  ERROR: {
    label: "Error",
    className:
      "bg-red-100 px-3 py-1 font-mono text-[10px] text-red-600 dark:bg-red-900 dark:text-red-300",
    icon: Icons.XIcon,
    iconClass: "",
  },
  INACTIVE: {
    label: "Paused",
    className:
      "bg-gray-100 px-3 py-1 font-mono text-[10px] text-gray-600 dark:bg-gray-900 dark:text-gray-300",
    icon: Icons.Close,
    iconClass: "",
  },
  CONNECTING: {
    label: "Connecting",
    className:
      "bg-blue-100 px-3 py-1 font-mono text-[10px] text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
};

export const SYNC_HISTORY_STATUS_CONFIG: Record<
  "SYNCING" | "ACTIVE" | "ERROR",
  SyncStatusConfig
> = {
  SYNCING: {
    label: "Syncing",
    className: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  ACTIVE: {
    label: "Success",
    className:
      "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300",
    icon: Icons.CheckIcon,
    iconClass: "",
  },
  ERROR: {
    label: "Failed",
    className: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
    icon: Icons.XIcon,
    iconClass: "",
  },
};

export function getSyncStatusConfig(
  status: string | null | undefined
): SyncStatusConfig {
  const normalizedStatus = (status ?? "ACTIVE") as SyncStatus;
  return SYNC_STATUS_CONFIG[normalizedStatus] ?? SYNC_STATUS_CONFIG.ACTIVE;
}

export function getSyncHistoryStatusConfig(
  status: string | null | undefined
): SyncStatusConfig {
  const normalizedStatus = (status ?? "ACTIVE") as
    | "SYNCING"
    | "ACTIVE"
    | "ERROR";
  return (
    SYNC_HISTORY_STATUS_CONFIG[normalizedStatus] ??
    SYNC_HISTORY_STATUS_CONFIG.ACTIVE
  );
}

export function isSyncingStatus(status: string | null | undefined): boolean {
  return status === "SYNCING";
}
