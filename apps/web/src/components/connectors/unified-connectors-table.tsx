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
    <div className="border border-border/50">
      <div className="border-border/50 border-b px-3 py-2.5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-3.5" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="size-4" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          className="border-border/40 border-b px-3 py-2.5 last:border-b-0"
          key={i}
        >
          <div className="flex items-center gap-4">
            <Skeleton className="size-3.5" />
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-7" />
              <div>
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="mt-1 h-2.5 w-14" />
              </div>
            </div>
            <Skeleton className="ml-auto h-4 w-14" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3.5 w-8" />
            <Skeleton className="size-4" />
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
        <div className="mx-auto mb-3 flex size-10 items-center justify-center border border-border/50 bg-background">
          <Icons.Search className="text-foreground/30" size={18} />
        </div>
        <p className="font-medium text-foreground/70 text-sm">No results</p>
        <p className="mt-1 text-foreground/40 text-xs">
          Nothing matches "{searchQuery}"
        </p>
        {onClearSearch && (
          <Button
            className="mt-4 h-8 px-3 text-xs"
            onClick={onClearSearch}
            variant="outline"
          >
            Clear
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

      <div className="border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedRows.size === filteredConnectors.length}
                  className="size-3.5"
                  onCheckedChange={(checked) =>
                    handleSelectAll(checked === true)
                  }
                />
              </TableHead>
              <TableHead className="font-normal text-[11px] text-foreground/50">
                {columnLabel}
              </TableHead>
              <TableHead className="font-normal text-[11px] text-foreground/50">
                Status
              </TableHead>
              <TableHead className="font-normal text-[11px] text-foreground/50">
                Last Sync
              </TableHead>
              <TableHead className="font-normal text-[11px] text-foreground/50">
                Docs
              </TableHead>
              <TableHead className="w-10" />
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
