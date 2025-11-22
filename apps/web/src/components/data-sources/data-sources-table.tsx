"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataSources } from "@/hooks/use-data-sources";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import { DataSourceDetailsSheet } from "./data-source-details-sheet";
import { DataSourcesEmptyState } from "./data-sources-empty-state";
import { DataSourcesTableRow } from "./data-sources-table-row";

export function DataSourcesTable() {
  const { data: dataSources, isLoading } = useDataSources();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedDataSource, setSelectedDataSource] = useState<{
    id: string;
    name: string;
    app: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.Loader2Icon
          className="animate-spin text-muted-foreground"
          size={24}
        />
      </div>
    );
  }

  if (!dataSources || dataSources.length === 0) {
    return <DataSourcesEmptyState />;
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(dataSources.map((ds) => ds.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  return (
    <>
      <div className="space-y-4">
        {selectedRows.size > 0 && (
          <BulkActionsToolbar
            onClearSelection={() => setSelectedRows(new Set())}
            selectedCount={selectedRows.size}
            selectedIds={Array.from(selectedRows)}
          />
        )}

        <div className="border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === dataSources.length}
                    className="cursor-pointer"
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked === true)
                    }
                  />
                </TableHead>
                <TableHead>Data Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((source) => (
                <DataSourcesTableRow
                  isSelected={selectedRows.has(source.id)}
                  key={source.id}
                  onRowClick={(selectedSource) =>
                    setSelectedDataSource(selectedSource)
                  }
                  onSelect={handleSelectRow}
                  source={source}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DataSourceDetailsSheet
        appId={selectedDataSource?.app ?? ""}
        connectorId={selectedDataSource?.id ?? null}
        connectorName={selectedDataSource?.name ?? ""}
        onClose={() => setSelectedDataSource(null)}
      />
    </>
  );
}
