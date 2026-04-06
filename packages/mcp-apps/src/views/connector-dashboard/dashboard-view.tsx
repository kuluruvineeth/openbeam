import { ConnectorTableRow } from "@openbeam/ui/components/connector-table-row";
import { ConnectorLogo } from "../../shared/connector-logo";
import { EmptyState } from "../../shared/empty-state";
import type { Connector } from "./types";

type DashboardViewProps = {
  connectors: Connector[];
};

export function DashboardView({ connectors }: DashboardViewProps) {
  const healthy = connectors.filter(
    (c) => c.status === "ACTIVE" || c.status === "SYNCING"
  ).length;
  const errored = connectors.filter((c) => c.status === "ERROR").length;
  const totalDocs = connectors.reduce((sum, c) => sum + c.documentCount, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-6">
        <Stat label="Sources" value={connectors.length} />
        <Stat label="Healthy" value={healthy} />
        {errored > 0 && <Stat label="Errors" value={errored} />}
        <Stat label="Documents" value={totalDocs.toLocaleString()} />
      </div>

      {connectors.length === 0 ? (
        <EmptyState
          description="Connect a data source to get started"
          icon={
            <svg
              aria-hidden="true"
              className="text-muted-foreground/50"
              fill="none"
              height="24"
              viewBox="0 0 24 24"
              width="24"
            >
              <path
                d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          }
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
            <ConnectorTableRow
              connectorType={connector.type}
              documentCount={connector.documentCount}
              icon={<ConnectorLogo size={28} type={connector.type} />}
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
