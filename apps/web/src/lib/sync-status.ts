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
      "bg-[#dbeafe] px-3 py-1 font-mono text-[10px] text-[#1e40af] dark:bg-[#172554] dark:text-[#60a5fa]",
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  ACTIVE: {
    label: "Indexed",
    className:
      "bg-[#ddf4eb] px-3 py-1 font-mono text-[10px] text-[#1d6f52] dark:bg-[#0d2922] dark:text-[#4ade80]",
    icon: Icons.CheckIcon,
    iconClass: "",
  },
  ERROR: {
    label: "Error",
    className:
      "bg-[#fee2e2] px-3 py-1 font-mono text-[10px] text-[#b91c1c] dark:bg-[#450a0a] dark:text-[#f87171]",
    icon: Icons.XIcon,
    iconClass: "",
  },
  INACTIVE: {
    label: "Paused",
    className:
      "bg-[#f3f4f6] px-3 py-1 font-mono text-[10px] text-[#4b5563] dark:bg-[#1f2937] dark:text-[#9ca3af]",
    icon: Icons.Close,
    iconClass: "",
  },
  CONNECTING: {
    label: "Connecting",
    className:
      "bg-[#fef3c7] px-3 py-1 font-mono text-[10px] text-[#92400e] dark:bg-[#422006] dark:text-[#fbbf24]",
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
    className:
      "bg-[#dbeafe] text-[#1e40af] dark:bg-[#172554] dark:text-[#60a5fa]",
    icon: Icons.Loader2Icon,
    iconClass: "animate-spin",
  },
  ACTIVE: {
    label: "Success",
    className:
      "bg-[#ddf4eb] text-[#1d6f52] dark:bg-[#0d2922] dark:text-[#4ade80]",
    icon: Icons.CheckIcon,
    iconClass: "",
  },
  ERROR: {
    label: "Failed",
    className:
      "bg-[#fee2e2] text-[#b91c1c] dark:bg-[#450a0a] dark:text-[#f87171]",
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
