import { SourceIcon } from "../../shared/source-icon";

export type Connector = {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSyncAt: string | null;
  documentCount: number;
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "bg-emerald-500", label: "Active" },
  ERROR: { color: "bg-red-500", label: "Error" },
  SYNCING: { color: "bg-amber-500", label: "Syncing" },
  INACTIVE: { color: "bg-zinc-400", label: "Inactive" },
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return "Never";
  }
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toLocaleString();
}

interface ConnectorRowProps {
  connector: Connector;
}

export function ConnectorRow({ connector }: ConnectorRowProps) {
  const status = STATUS_CONFIG[connector.status] ?? STATUS_CONFIG.INACTIVE;

  return (
    <div className="grid grid-cols-[1fr_80px_100px_80px] items-center gap-2 border-border/50 border-b px-3 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <SourceIcon size={24} type={connector.type} />
        <span className="truncate font-medium text-sm">{connector.name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.color}`} />
        <span className="text-muted-foreground text-xs">{status.label}</span>
      </div>
      <span className="text-muted-foreground text-xs tabular-nums">
        {formatRelativeTime(connector.lastSyncAt)}
      </span>
      <span className="text-right text-muted-foreground text-xs tabular-nums">
        {formatNumber(connector.documentCount)}
      </span>
    </div>
  );
}
