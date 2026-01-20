"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "../../utils/cn";
import { Spinner } from "../spinner";

interface VirtualTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selection: T[]) => void;
  stickyColumns?: number;
  enableSelection?: boolean;
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  emptyState?: ReactNode;
  className?: string;
}

function VirtualTable<T extends { id: string }>({
  data,
  columns,
  rowHeight = 45,
  overscan = 10,
  onRowClick,
  onSelectionChange,
  stickyColumns = 1,
  enableSelection = true,
  isLoading,
  hasNextPage,
  fetchNextPage,
  emptyState,
  className,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: enableSelection,
    getRowId: (row) => row.id,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const selectRange = useCallback(
    (fromIndex: number, toIndex: number) => {
      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
      const newSelection: RowSelectionState = { ...rowSelection };

      for (let i = start; i <= end; i++) {
        const rowId = rows[i]?.id;
        if (rowId) {
          newSelection[rowId] = true;
        }
      }

      setRowSelection(newSelection);
    },
    [rows, rowSelection]
  );

  const handleRowClick = useCallback(
    (index: number, event: React.MouseEvent) => {
      const row = rows[index];
      if (!row) {
        return;
      }

      const isShiftClick =
        enableSelection && event.shiftKey && lastSelectedIndex !== null;
      const isModifierClick =
        enableSelection && (event.metaKey || event.ctrlKey);

      if (isShiftClick) {
        selectRange(lastSelectedIndex, index);
      } else if (isModifierClick) {
        row.toggleSelected();
        setLastSelectedIndex(index);
      } else {
        onRowClick?.(row.original);
      }
    },
    [rows, lastSelectedIndex, enableSelection, onRowClick, selectRange]
  );

  const selectedRows = useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((id) => rowSelection[id])
        .map((id) => data.find((d) => d.id === id))
        .filter(Boolean) as T[],
    [rowSelection, data]
  );

  useEffect(() => {
    onSelectionChange?.(selectedRows);
  }, [selectedRows, onSelectionChange]);

  const handleScroll = useCallback(() => {
    if (!(parentRef.current && hasNextPage) || isLoading) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8) {
      fetchNextPage?.();
    }
  }, [hasNextPage, isLoading, fetchNextPage]);

  if (!isLoading && data.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={cn("relative flex h-full flex-col", className)}>
      <div
        className="scrollbar-thin flex-1 overflow-auto"
        onScroll={handleScroll}
        ref={parentRef}
      >
        <div style={{ height: totalSize, width: "100%", position: "relative" }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, idx) => (
                    <th
                      className={cn(
                        "h-10 px-3 text-left font-medium text-muted-foreground text-xs",
                        "border-border/50 border-b",
                        idx < stickyColumns &&
                          "sticky left-0 z-10 bg-background"
                      )}
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        left:
                          idx < stickyColumns ? `${idx * 150}px` : undefined,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) {
                  return null;
                }
                return (
                  <tr
                    className={cn(
                      "group cursor-pointer transition-colors",
                      "hover:bg-muted/50",
                      row.getIsSelected() && "bg-accent/50"
                    )}
                    data-index={virtualRow.index}
                    key={row.id}
                    onClick={(e) => handleRowClick(virtualRow.index, e)}
                    ref={virtualizer.measureElement}
                    style={{
                      height: rowHeight,
                      transform: `translateY(${virtualRow.start}px)`,
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      display: "flex",
                    }}
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <td
                        className={cn(
                          "flex items-center px-3 text-sm",
                          "border-border/30 border-b",
                          idx < stickyColumns &&
                            "sticky left-0 z-10 bg-background"
                        )}
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          left:
                            idx < stickyColumns ? `${idx * 150}px` : undefined,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isLoading && (
        <div className="absolute right-0 bottom-0 left-0 flex h-12 items-center justify-center bg-gradient-to-t from-background">
          <Spinner className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

export { VirtualTable };
export type { VirtualTableProps };
