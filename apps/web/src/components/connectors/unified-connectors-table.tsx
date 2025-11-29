"use client";

import { useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import { SharedTableRow } from "./shared-table-row";

type ConnectorData = {
  id: string;
  name: string;
  app: string;
  status: string;
  lastSyncedAt: string | Date | null;
  syncStatus: {
    connector: {
      id: string;
      status: string | null;
      lastSyncedAt: string | Date | null;
      lastError: string | null;
    };
    stats: {
      totalIndexed: number;
    };
  } | null;
};

type UnifiedConnectorsTableProps = {
  connectors: ConnectorData[] | undefined;
  isLoading: boolean;
  searchQuery?: string;
  onRowClick: (connector: ConnectorData) => void;
  onClearSearch?: () => void;
  emptyState: React.ReactNode;
  columnLabel?: string;
};

function TableSkeleton() {
  return (
    <div className="border border-border bg-background">
      <div className="border-border/50 border-b p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          className="border-border/50 border-b p-4 last:border-b-0"
          key={`skeleton-row-${i}`}
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded" />
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
            <Skeleton className="ml-auto h-6 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UnifiedConnectorsTable({
  connectors,
  isLoading,
  searchQuery,
  onRowClick,
  onClearSearch,
  emptyState,
  columnLabel = "Connector",
}: UnifiedConnectorsTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filteredConnectors = useMemo(() => {
    if (!connectors) {
      return [];
    }
    if (!searchQuery) {
      return connectors;
    }

    const search = searchQuery.toLowerCase();
    return connectors.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.app.toLowerCase().includes(search)
    );
  }, [connectors, searchQuery]);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!connectors || connectors.length === 0) {
    return <>{emptyState}</>;
  }

  // No results for search
  if (searchQuery && filteredConnectors.length === 0) {
    return (
      <div className="flex h-[calc(100vh-400px)] flex-col items-center justify-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border/60 bg-background">
          <Icons.Search className="text-foreground/40" size={24} />
        </div>
        <h3 className="font-medium text-foreground text-lg">No results</h3>
        <p className="mt-2 max-w-md text-center text-foreground/50 text-sm">
          No connectors match "{searchQuery}"
        </p>
        {onClearSearch && (
          <Button className="mt-4" onClick={onClearSearch} variant="outline">
            Clear search
          </Button>
        )}
      </div>
    );
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredConnectors.map((c) => c.id)));
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
                  checked={selectedRows.size === filteredConnectors.length}
                  className="cursor-pointer"
                  onCheckedChange={(checked) =>
                    handleSelectAll(checked === true)
                  }
                />
              </TableHead>
              <TableHead>{columnLabel}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConnectors.map((connector) => (
              <SharedTableRow
                connector={connector}
                isSelected={selectedRows.has(connector.id)}
                key={connector.id}
                onRowClick={onRowClick}
                onSelect={handleSelectRow}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
