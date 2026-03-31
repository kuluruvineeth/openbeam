import { ConnectorRow } from "@openbeam/ui/components/connector-row";
import { ConnectorLogo } from "../../shared/connector-logo";
import { EmptyState } from "../../shared/empty-state";
import { SectionHeader } from "../../shared/section-header";
import { StatCard } from "../../shared/stat-card";
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
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Connected" value={active} />
        <StatCard label="Documents" value={totalDocs.toLocaleString()} />
        <StatCard
          label="Errors"
          trend={errors > 0 ? "down" : "neutral"}
          value={errors}
        />
      </div>

      <SectionHeader count={connectors.length} title="Connectors" />

      {connectors.length === 0 ? (
        <EmptyState
          description="Connect a data source to get started"
          title="No connectors"
        />
      ) : (
        <div className="rounded-sm border border-border/50">
          <div className="grid grid-cols-[1fr_100px_100px_60px] gap-3 border-border/50 border-b px-3 py-1.5 font-medium text-muted-foreground text-xs">
            <span>Source</span>
            <span>Status</span>
            <span>Last Sync</span>
            <span className="text-right">Docs</span>
          </div>
          {connectors.map((connector) => (
            <ConnectorRow
              appLogo={<ConnectorLogo size={22} type={connector.type} />}
              connectorType={connector.type}
              documentCount={connector.documentCount}
              id={connector.id}
              key={connector.id}
              lastSyncAt={connector.lastSyncAt}
              name={connector.name}
              status={connector.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
