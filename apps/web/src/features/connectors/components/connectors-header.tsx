"use client";

import { useQueryState } from "nuqs";
import { SearchField } from "@/components/search-field";
import { useConnectorsStats } from "@/features/connectors/hooks";
import { ConnectorsTabs } from "./connectors-tabs";

export function ConnectorsHeader() {
  const [tab] = useQueryState("tab", {
    defaultValue: "connected",
  });
  const isSkillsTab = tab === "skills";
  const { data: connectorStats, isLoading: connectorsLoading } =
    useConnectorsStats();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl tracking-tight">Connectors</h1>
        <SearchField
          placeholder={isSkillsTab ? "Search skills" : "Search"}
          shallow
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <ConnectorsTabs />
        {!connectorsLoading && connectorStats && (
          <div className="hidden items-center gap-6 md:flex">
            <Stat label="Connected" value={connectorStats.totalConnectors} />
            <Stat label="Active" value={connectorStats.activeConnectors} />
            <Stat
              label="Documents"
              value={connectorStats.totalDocuments.toLocaleString()}
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
