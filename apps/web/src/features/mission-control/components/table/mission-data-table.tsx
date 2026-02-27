"use client";

import { closestCenter, DndContext } from "@dnd-kit/core";
import { VirtualRow } from "@openplane/ui";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useStickyColumns } from "@/lib/hooks/use-sticky-columns";
import { useTableDnd } from "@/lib/hooks/use-table-dnd";
import { useTableSettings } from "@/lib/hooks/use-table-settings";

import {
  MISSION_TABLE_CONFIG,
  type MissionRow,
  missionColumns,
} from "./mission-columns";
import { MissionTableHeader } from "./mission-table-header";

const { stickyColumns, nonReorderableColumns, nonClickableColumns, rowHeight } =
  MISSION_TABLE_CONFIG;

type MissionDataTableProps = {
  data: MissionRow[];
  hasMore: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onRowClick: (id: string) => void;
};

function MissionDataTable({
  data,
  hasMore,
  fetchNextPage,
  isFetchingNextPage,
  onRowClick,
}: MissionDataTableProps) {
  "use no memo";
  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const {
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    columnOrder,
    setColumnOrder,
  } = useTableSettings({ tableId: "mission-control" });

  const table = useReactTable({
    data,
    columns: missionColumns,
    state: {
      columnVisibility,
      columnSizing,
      columnOrder,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getRowId: (row) => row.id,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const { sensors, handleDragEnd } = useTableDnd(table);

  const { getStickyStyle, getStickyClassName } = useStickyColumns({
    columnVisibility,
    table,
    stickyColumns: [...stickyColumns],
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = parentRef.current;
    if (!(sentinel && container && hasMore) || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          fetchNextPage();
        }
      },
      { root: container, rootMargin: "100px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  const handleCellClick = useCallback(
    (rowId: string) => {
      const idx = rows.findIndex((r) => r.id === rowId);
      if (idx !== -1) {
        setFocusedIndex(idx);
      }
      onRowClick(rowId);
    },
    [rows, onRowClick]
  );

  useHotkeys("j", () => {
    setFocusedIndex((prev) => {
      const next = Math.min(prev + 1, rows.length - 1);
      const height = parentRef.current?.clientHeight ?? 600;
      parentRef.current?.scrollTo({
        top: next * rowHeight - height / 2,
        behavior: "smooth",
      });
      return next;
    });
  }, [rows.length]);

  useHotkeys("k", () => {
    setFocusedIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      const height = parentRef.current?.clientHeight ?? 600;
      parentRef.current?.scrollTo({
        top: next * rowHeight - height / 2,
        behavior: "smooth",
      });
      return next;
    });
  });

  useHotkeys("enter", () => {
    const row = rows[focusedIndex];
    if (row) {
      onRowClick(row.id);
    }
  }, [focusedIndex, rows, onRowClick]);

  useHotkeys("x", () => {
    const row = rows[focusedIndex];
    if (row) {
      row.toggleSelected();
    }
  }, [focusedIndex, rows]);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <div className="relative flex-1 overflow-hidden rounded-sm border border-border/50">
        <div
          className="no-scrollbar overflow-auto overscroll-none"
          ref={parentRef}
          style={{ maxHeight: "calc(100vh - 260px)" }}
        >
          <table className="w-full min-w-full border-collapse">
            <MissionTableHeader
              getStickyClassName={getStickyClassName}
              getStickyStyle={getStickyStyle}
              nonReorderableColumns={nonReorderableColumns}
              table={table}
            />
            <tbody
              className="relative block"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) {
                  return null;
                }

                return (
                  <VirtualRow
                    columnOrder={columnOrder}
                    columnSizing={columnSizing}
                    columnVisibility={columnVisibility}
                    getStickyClassName={getStickyClassName}
                    getStickyStyle={getStickyStyle}
                    isSelected={row.getIsSelected()}
                    key={row.id}
                    nonClickableColumns={nonClickableColumns}
                    onCellClick={handleCellClick}
                    row={row}
                    rowHeight={rowHeight}
                    virtualStart={virtualRow.start}
                  />
                );
              })}
            </tbody>
          </table>

          {hasMore && (
            <div className="h-10" ref={sentinelRef}>
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-2 text-muted-foreground text-xs">
                  Loading more...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
}

export { MissionDataTable };
export type { MissionDataTableProps };
