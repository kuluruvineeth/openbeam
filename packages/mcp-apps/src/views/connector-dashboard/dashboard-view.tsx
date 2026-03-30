import { ConnectorRow } from "@openbeam/ui/components/connector-row";
import type { Connector } from "./connector-row";

type DashboardViewProps = {
  connectors: Connector[];
};

export function DashboardView({ connectors }: DashboardViewProps) {
  return (
    <div>
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm tracking-tight">Connectors</h2>
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs tabular-nums">
            {connectors.length}
          </span>
        </div>
      </div>
      <div className="rounded-md border border-border/50">
        <div className="grid grid-cols-[1fr_100px_100px_80px] gap-3 border-border/50 border-b px-3 py-1.5 font-medium text-muted-foreground text-xs">
          <span>Source</span>
          <span>Status</span>
          <span>Last Sync</span>
          <span className="text-right">Docs</span>
        </div>
        {connectors.length === 0 ? (
          <div className="px-3 py-6 text-center text-muted-foreground text-xs">
            No connectors configured
          </div>
        ) : (
          connectors.map((connector) => (
            <ConnectorRow
              connectorType={connector.type}
              documentCount={connector.documentCount}
              id={connector.id}
              key={connector.id}
              lastSyncAt={connector.lastSyncAt}
              name={connector.name}
              status={connector.status}
            />
          ))
        )}
      </div>
    </div>
  );
}
