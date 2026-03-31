import { cn } from "@openbeam/ui/utils";
import { formatNumber, formatRelativeTime } from "@openbeam/ui/utils/format";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { Connector } from "./types";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; animate?: boolean }
> = {
  ACTIVE: {
    label: "Indexed",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  SYNCING: {
    label: "Syncing",
    className: "bg-foreground/[0.04] text-foreground/70",
    animate: true,
  },
  ERROR: {
    label: "Error",
    className: "bg-red-500/10 text-red-500/90",
  },
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
    animate: true,
  },
  INACTIVE: {
    label: "Paused",
    className: "bg-foreground/[0.03] text-foreground/40",
  },
  PAUSED: {
    label: "Paused",
    className: "bg-foreground/[0.03] text-foreground/40",
  },
};

function SyncStatusBadge({
  status,
  documentCount,
}: {
  status: string;
  documentCount: number;
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.INACTIVE;
  const isIndexed = status === "ACTIVE" && documentCount > 0;
  const label = isIndexed ? "Indexed" : config.label;
  const className = isIndexed
    ? "bg-emerald-500/10 text-emerald-600"
    : config.className;

  return (
    <span
      className={`inline-flex items-center gap-1.5 border-transparent px-2 py-0.5 font-mono text-[10px] ${className}`}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isIndexed && "bg-emerald-500",
          !isIndexed &&
            (status === "SYNCING" || status === "CONNECTING") &&
            "animate-pulse bg-current",
          !isIndexed &&
            status !== "SYNCING" &&
            status !== "CONNECTING" &&
            "bg-current"
        )}
      />
      {label}
    </span>
  );
}

type ConnectorTableRowProps = {
  connector: Connector;
};

export function ConnectorTableRow({ connector }: ConnectorTableRowProps) {
  return (
    <div className="group flex items-center gap-4 border-border/50 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-foreground/[0.02]">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <ConnectorLogo size={28} type={connector.type} />
        <div className="min-w-0">
          <p className="truncate text-[13px] text-foreground/90">
            {connector.name}
          </p>
          <p className="text-[10px] text-foreground/40 uppercase tracking-wide">
            {connector.type}
          </p>
        </div>
      </div>

      <div className="w-[100px] shrink-0">
        <SyncStatusBadge
          documentCount={connector.documentCount}
          status={connector.status}
        />
      </div>

      <span className="w-[90px] shrink-0 text-[11px] text-foreground/50">
        {connector.lastSyncAt
          ? formatRelativeTime(connector.lastSyncAt)
          : "Never"}
      </span>

      <span className="w-[60px] shrink-0 text-right font-mono text-[13px] text-foreground/70 tabular-nums">
        {formatNumber(connector.documentCount)}
      </span>
    </div>
  );
}
