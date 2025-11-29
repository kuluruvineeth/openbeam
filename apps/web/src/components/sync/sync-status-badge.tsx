"use client";

import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { getSyncStatusConfig, type SyncStatus } from "@/lib/sync-status";

type SyncStatusData = {
  status: SyncStatus;
  totalIndexed?: number;
  lastSyncedAt?: Date | string | null;
  error?: string | null;
};

type SyncStatusBadgeProps = {
  data: SyncStatusData;
  variant?: "compact" | "detailed";
  onClick?: () => void;
};

// Helper to determine display status
function getDisplayStatus(
  status: SyncStatus,
  totalIndexed?: number
): SyncStatus | "READY" {
  // If ACTIVE but no documents indexed, show as "Ready" instead of "Indexed"
  if (
    status === "ACTIVE" &&
    (totalIndexed === undefined || totalIndexed === 0)
  ) {
    return "READY";
  }
  return status;
}

// Extended status config with READY - uses green to indicate positive/idle state
const READY_STATUS_CONFIG = {
  label: "Ready",
  className:
    "bg-[#ddf4eb] px-3 py-1 font-mono text-[10px] text-[#1d6f52] dark:bg-[#0d2922] dark:text-[#4ade80]",
  icon: Icons.CheckIcon,
  iconClass: "",
};

export function SyncStatusBadge({
  data,
  variant = "compact",
  onClick,
}: SyncStatusBadgeProps) {
  const displayStatus = getDisplayStatus(data.status, data.totalIndexed);
  const config =
    displayStatus === "READY"
      ? READY_STATUS_CONFIG
      : getSyncStatusConfig(displayStatus);
  const StatusIcon = config.icon;

  if (variant === "compact") {
    const content = (
      <div className="flex items-center gap-1.5">
        <StatusIcon className={config.iconClass} size={10} />
        {config.label}
        {data.totalIndexed !== undefined && data.totalIndexed > 0 && (
          <>
            <span>•</span>
            <span>{data.totalIndexed.toLocaleString()}</span>
          </>
        )}
      </div>
    );

    if (onClick) {
      return (
        <button
          className={`${config.className} cursor-pointer transition-opacity hover:opacity-80`}
          onClick={onClick}
          type="button"
        >
          {content}
        </button>
      );
    }

    return <div className={config.className}>{content}</div>;
  }

  // Detailed variant
  const detailedContent = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className={config.className}>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={config.iconClass} size={10} />
            {config.label}
          </div>
        </div>
        {data.totalIndexed !== undefined && (
          <span className="font-medium text-sm">
            {data.totalIndexed.toLocaleString()} docs
          </span>
        )}
      </div>

      {data.lastSyncedAt && (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Icons.History size={12} />
          <span>
            {formatDistanceToNow(
              typeof data.lastSyncedAt === "string"
                ? new Date(data.lastSyncedAt)
                : data.lastSyncedAt,
              { addSuffix: true }
            )}
          </span>
        </div>
      )}

      {data.error && (
        <p className="line-clamp-1 text-destructive text-xs">{data.error}</p>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        className="cursor-pointer border border-border bg-background p-3 transition-all hover:shadow-sm"
        onClick={onClick}
        type="button"
      >
        {detailedContent}
      </button>
    );
  }

  return (
    <div className="border border-border bg-background p-3">
      {detailedContent}
    </div>
  );
}
