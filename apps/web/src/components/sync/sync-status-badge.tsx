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
  showCount?: boolean;
  onClick?: () => void;
};

// Status label mapping - "ACTIVE" with docs = "Indexed", without = "Ready"
function getStatusLabel(status: SyncStatus, totalIndexed?: number): string {
  if (status === "ACTIVE") {
    return totalIndexed && totalIndexed > 0 ? "Indexed" : "Ready";
  }
  return getSyncStatusConfig(status).label;
}

export function SyncStatusBadge({
  data,
  variant = "compact",
  showCount = false,
  onClick,
}: SyncStatusBadgeProps) {
  const config = getSyncStatusConfig(data.status);
  const StatusIcon = config.icon;
  const label = getStatusLabel(data.status, data.totalIndexed);

  if (variant === "compact") {
    const content = (
      <div className="flex items-center gap-1.5">
        <StatusIcon className={config.iconClass} size={10} />
        <span>{label}</span>
        {showCount &&
          data.totalIndexed !== undefined &&
          data.totalIndexed > 0 && (
            <>
              <span className="text-current/50">·</span>
              <span>{data.totalIndexed.toLocaleString()}</span>
            </>
          )}
      </div>
    );

    const className = `inline-flex px-2 py-0.5 font-mono text-[10px] ${config.className}`;

    if (onClick) {
      return (
        <button
          className={`${className} cursor-pointer transition-opacity hover:opacity-80`}
          onClick={onClick}
          type="button"
        >
          {content}
        </button>
      );
    }

    return <div className={className}>{content}</div>;
  }

  // Detailed variant
  const detailedContent = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex px-2 py-0.5 font-mono text-[10px] ${config.className}`}
        >
          <div className="flex items-center gap-1.5">
            <StatusIcon className={config.iconClass} size={10} />
            {label}
          </div>
        </div>
        {data.totalIndexed !== undefined && (
          <span className="font-mono text-[13px] tabular-nums">
            {data.totalIndexed.toLocaleString()}
          </span>
        )}
      </div>

      {data.lastSyncedAt && (
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/40">
          <Icons.History size={11} />
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
        <p className="line-clamp-1 text-[11px] text-destructive">
          {data.error}
        </p>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        className="cursor-pointer border border-border/50 bg-background p-3 transition-colors hover:bg-foreground/2"
        onClick={onClick}
        type="button"
      >
        {detailedContent}
      </button>
    );
  }

  return (
    <div className="border border-border/50 bg-background p-3">
      {detailedContent}
    </div>
  );
}
