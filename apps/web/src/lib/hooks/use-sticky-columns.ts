"use client";

import type { VisibilityState } from "@tanstack/react-table";
import type React from "react";
import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

type StickyColumnConfig = { id: string; width: number };

interface TableColumn {
  id: string;
  getIsVisible: () => boolean;
}

interface TableInterface {
  getAllLeafColumns: () => TableColumn[];
}

interface UseStickyColumnsProps {
  columnVisibility?: VisibilityState;
  table?: TableInterface;
  loading?: boolean;
  stickyColumns?: StickyColumnConfig[];
}

export function useStickyColumns({
  columnVisibility,
  table,
  loading,
  stickyColumns = [],
}: UseStickyColumnsProps) {
  const isVisible = useCallback(
    (id: string) =>
      loading ||
      table
        ?.getAllLeafColumns()
        .find((col) => col.id === id)
        ?.getIsVisible() ||
      (columnVisibility && columnVisibility[id] !== false),
    [loading, table, columnVisibility]
  );

  const stickyColumnIds = useMemo(
    () => new Set(stickyColumns.map((col) => col.id)),
    [stickyColumns]
  );

  const stickyPositions = useMemo(() => {
    let position = 0;
    const positions: Record<string, number> = {};

    for (const col of stickyColumns) {
      if (isVisible(col.id)) {
        positions[col.id] = position;
        position += col.width;
      }
    }

    return positions;
  }, [isVisible, stickyColumns]);

  const getStickyStyle = useCallback(
    (columnId: string) => {
      const position = stickyPositions[columnId];
      return position !== undefined
        ? ({ "--stick-left": `${position}px` } as React.CSSProperties)
        : {};
    },
    [stickyPositions]
  );

  const getStickyClassName = useCallback(
    (columnId: string, baseClassName?: string) => {
      const isSticky = stickyColumnIds.has(columnId);
      return cn(
        baseClassName,
        isSticky && "md:sticky md:left-[var(--stick-left)]"
      );
    },
    [stickyColumnIds]
  );

  return {
    stickyPositions,
    getStickyStyle,
    getStickyClassName,
    isVisible,
  };
}
