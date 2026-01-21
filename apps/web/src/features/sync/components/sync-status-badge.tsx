"use client";

import { Badge, Card } from "@openplane/ui";
import { formatDistanceToNow } from "date-fns";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { getSyncStatusConfig, type SyncStatus } from "../lib/sync-status";

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
      <>
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
      </>
    );

    const badgeClassName = cn(
      "gap-1.5 border-transparent font-mono text-[10px]",
      config.className,
      onClick && "cursor-pointer transition-opacity hover:opacity-80"
    );

    if (onClick) {
      return (
        <button onClick={onClick} type="button">
          <Badge className={badgeClassName}>{content}</Badge>
        </button>
      );
    }

    return <Badge className={badgeClassName}>{content}</Badge>;
  }

  // Detailed variant
  const detailedContent = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge
          className={cn(
            "gap-1.5 border-transparent font-mono text-[10px]",
            config.className
          )}
        >
          <StatusIcon className={config.iconClass} size={10} />
          {label}
        </Badge>
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
      <button onClick={onClick} type="button">
        <Card className="cursor-pointer border-border/50 p-3 transition-colors hover:bg-foreground/2">
          {detailedContent}
        </Card>
      </button>
    );
  }

  return <Card className="border-border/50 p-3">{detailedContent}</Card>;
}
