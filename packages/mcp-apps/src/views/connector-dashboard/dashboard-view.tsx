import { EmptyState } from "../../shared/empty-state";
import { StatCard } from "../../shared/stat-card";
import { ConnectorTableRow } from "./connector-table-row";
import type { Connector } from "./types";

type DashboardViewProps = {
  connectors: Connector[];
};

export function DashboardView({ connectors }: DashboardViewProps) {
  const active = connectors.filter(
    (c) => c.status === "ACTIVE" || c.status === "SYNCING"
  ).length;
  const errors = connectors.filter(
    (c) => c.status === "ERROR" || c.status === "AUTH_EXPIRED"
  ).length;
  const totalDocs = connectors.reduce((sum, c) => sum + c.documentCount, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden items-center gap-6 md:flex">
        <Stat label="Connected" value={active} />
        <Stat label="Active" value={connectors.length} />
        <Stat label="Documents" value={totalDocs.toLocaleString()} />
      </div>

      <div className="grid grid-cols-3 gap-2 md:hidden">
        <StatCard label="Connected" value={active} />
        <StatCard label="Documents" value={totalDocs.toLocaleString()} />
        <StatCard
          label="Errors"
          trend={errors > 0 ? "down" : "neutral"}
          value={errors}
        />
      </div>

      {connectors.length === 0 ? (
        <EmptyState
          description="Connect a data source to get started"
          title="No connectors"
        />
      ) : (
        <div className="border border-border/50">
          <div className="flex items-center gap-4 border-border/50 border-b px-3 py-1.5">
            <span className="min-w-0 flex-1 font-normal text-[11px] text-foreground/50">
              Connector
            </span>
            <span className="w-[100px] shrink-0 font-normal text-[11px] text-foreground/50">
              Status
            </span>
            <span className="w-[90px] shrink-0 font-normal text-[11px] text-foreground/50">
              Last Sync
            </span>
            <span className="w-[60px] shrink-0 text-right font-normal text-[11px] text-foreground/50">
              Docs
            </span>
          </div>
          {connectors.map((connector) => (
            <ConnectorTableRow connector={connector} key={connector.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
