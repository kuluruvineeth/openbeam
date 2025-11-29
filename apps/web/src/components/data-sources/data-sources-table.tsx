"use client";

import { useState } from "react";
import { UnifiedConnectorsTable } from "@/components/connectors/unified-connectors-table";
import { useDataSources } from "@/hooks/use-data-sources";
import { DataSourceDetailsSheet } from "./data-source-details-sheet";
import { DataSourcesEmptyState } from "./data-sources-empty-state";

type SelectedConnector = {
  id: string;
  name: string;
  app: string;
} | null;

export function DataSourcesTable() {
  const { data: dataSources, isLoading } = useDataSources();
  const [selectedConnector, setSelectedConnector] =
    useState<SelectedConnector>(null);

  return (
    <>
      <UnifiedConnectorsTable
        columnLabel="Data Source"
        connectors={dataSources ?? undefined}
        emptyState={<DataSourcesEmptyState />}
        isLoading={isLoading}
        onRowClick={(connector) =>
          setSelectedConnector({
            id: connector.id,
            name: connector.name,
            app: connector.app,
          })
        }
      />

      <DataSourceDetailsSheet
        appId={selectedConnector?.app ?? ""}
        connectorId={selectedConnector?.id ?? null}
        connectorName={selectedConnector?.name ?? ""}
        onClose={() => setSelectedConnector(null)}
      />
    </>
  );
}
