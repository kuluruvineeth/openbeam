"use client";

import { ConnectorsTabs } from "@/components/connectors/connectors-tabs";
import { SearchField } from "@/components/search-field";
import { useConnectorsStats } from "@/hooks/use-connectors";

export function ConnectorsHeader() {
  const { data: stats, isLoading } = useConnectorsStats();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl tracking-tight">Connectors</h1>
        <SearchField placeholder="Search" shallow />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <ConnectorsTabs />
        {!isLoading && stats && (
          <div className="hidden items-center gap-6 md:flex">
            <Stat label="Connected" value={stats.totalConnectors} />
            <Stat label="Active" value={stats.activeConnectors} />
            <Stat
              label="Documents"
              value={stats.totalDocuments.toLocaleString()}
            />
          </div>
        )}
      </div>
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
