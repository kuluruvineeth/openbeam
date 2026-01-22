"use client";

import { useState } from "react";
import { DataSourceDetailsSheet } from "@/components/data-sources/data-source-details-sheet";
import { DataSourcesEmptyState } from "@/components/data-sources/data-sources-empty-state";
import { UnifiedConnectorsTable } from "@/features/connectors/components";
import { useDataSources } from "@/hooks/use-data-sources";

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
