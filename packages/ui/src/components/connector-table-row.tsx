"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { formatNumber, formatRelativeTime } from "../utils/format";

type SyncStatus =
  | "ACTIVE"
  | "SYNCING"
  | "ERROR"
  | "AUTH_EXPIRED"
  | "RATE_LIMITED"
  | "CONNECTING"
  | "INACTIVE"
  | "PAUSED"
  | "DELETING";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Indexed", className: "bg-emerald-500/10 text-emerald-600" },
  SYNCING: {
    label: "Syncing",
    className: "bg-foreground/[0.04] text-foreground/70",
  },
  ERROR: { label: "Error", className: "bg-red-500/10 text-red-500/90" },
  AUTH_EXPIRED: {
    label: "Auth Expired",
    className: "bg-red-500/10 text-red-500/90",
  },
  RATE_LIMITED: {
    label: "Rate Limited",
    className: "bg-amber-500/10 text-amber-600",
  },
  CONNECTING: {
    label: "Connecting",
    className: "bg-amber-500/10 text-amber-600",
  },
  INACTIVE: {
    label: "Paused",
    className: "bg-foreground/[0.03] text-foreground/40",
  },
  PAUSED: {
    label: "Paused",
    className: "bg-foreground/[0.03] text-foreground/40",
  },
  DELETING: { label: "Deleting", className: "bg-red-500/10 text-red-500/90" },
};

function InlineSyncBadge({
  status,
  documentCount,
}: {
  status: string;
  documentCount: number;
}) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.INACTIVE;
  const isIndexed = status === "ACTIVE" && documentCount > 0;
  const isReady = status === "ACTIVE" && documentCount === 0;
  let label = config.label;
  if (isIndexed) {
    label = "Indexed";
  } else if (isReady) {
    label = "Ready";
  }
  const badgeClass = isIndexed
    ? "bg-emerald-500/10 text-emerald-600"
    : config.className;
  const isAnimated = status === "SYNCING" || status === "CONNECTING";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-transparent px-2 py-0.5 font-mono text-[10px]",
        badgeClass
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isIndexed && "bg-emerald-500",
          isAnimated && "animate-pulse bg-current",
          !(isIndexed || isAnimated) && "bg-current"
        )}
      />
      {label}
    </span>
  );
}

type ConnectorTableRowProps = {
  id: string;
  name: string;
  connectorType: string;
  appTypeLabel?: string;
  status: string;
  lastSyncAt?: string | null;
  documentCount: number;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
};

const ConnectorTableRow = React.forwardRef<
  HTMLDivElement,
  ConnectorTableRowProps
>(
  (
    {
      name,
      connectorType,
      appTypeLabel,
      status,
      lastSyncAt,
      documentCount,
      icon,
      onClick,
      className,
    },
    ref
  ) => {
    const Tag = onClick ? "button" : "div";
    return (
      <Tag
        className={cn(
          "group flex w-full items-center gap-4 border-border/50 border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
          onClick && "cursor-pointer hover:bg-foreground/[0.02]",
          className
        )}
        onClick={onClick}
        ref={ref as React.Ref<HTMLButtonElement & HTMLDivElement>}
        type={onClick ? "button" : undefined}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon ?? <div className="size-7" />}
          <div className="min-w-0">
            <p className="truncate text-[13px] text-foreground/90">{name}</p>
            <p className="text-[10px] text-foreground/40 uppercase tracking-wide">
              {appTypeLabel ?? connectorType}
            </p>
          </div>
        </div>

        <div className="w-[100px] shrink-0">
          <InlineSyncBadge documentCount={documentCount} status={status} />
        </div>

        <span className="w-[90px] shrink-0 text-[11px] text-foreground/50">
          {lastSyncAt ? formatRelativeTime(lastSyncAt) : "Never"}
        </span>

        <span className="w-[60px] shrink-0 text-right font-mono text-[13px] text-foreground/70 tabular-nums">
          {formatNumber(documentCount)}
        </span>
      </Tag>
    );
  }
);
ConnectorTableRow.displayName = "ConnectorTableRow";

export { ConnectorTableRow, InlineSyncBadge };
export type { ConnectorTableRowProps, SyncStatus };
