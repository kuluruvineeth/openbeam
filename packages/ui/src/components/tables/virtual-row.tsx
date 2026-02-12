"use client";

import type {
  Cell,
  ColumnOrderState,
  ColumnSizingState,
  Row,
  VisibilityState,
} from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type React from "react";
import type { CSSProperties } from "react";
import { memo } from "react";
import { cn } from "../../utils/cn";
import { TableCell, TableRow } from "../table";
import type { TableColumnMeta } from "./types";

interface VirtualRowProps<TData> {
  row: Row<TData>;
  virtualStart: number;
  rowHeight: number;
  onCellClick?: (rowId: string, columnId: string) => void;
  getStickyStyle: (columnId: string) => CSSProperties;
  getStickyClassName: (columnId: string, baseClassName?: string) => string;
  nonClickableColumns?: Set<string>;
  columnSizing?: ColumnSizingState;
  columnOrder?: ColumnOrderState;
  columnVisibility?: VisibilityState;
  isSelected?: boolean;
}

function VirtualRowInner<TData>({
  row,
  virtualStart,
  rowHeight,
  onCellClick,
  getStickyStyle,
  getStickyClassName,
  nonClickableColumns = new Set(["select", "actions"]),
}: VirtualRowProps<TData>) {
  const cells = row.getVisibleCells();
  const lastCellId = cells.at(-1)?.column.id ?? "";

  return (
    <TableRow
      className={cn(
        "group cursor-pointer select-text",
        "hover:bg-[#F2F1EF] hover:dark:bg-[#1A1A1A]",
        "flex items-center border-0",
        "absolute top-0 left-0 w-full min-w-full"
      )}
      data-index={row.index}
      style={{
        height: rowHeight,
        transform: `translateY(${virtualStart}px)`,
        contain: "layout style paint",
      }}
    >
      {cells.map((cell: Cell<TData, unknown>, cellIndex: number) => {
        const columnId = cell.column.id;
        const meta = cell.column.columnDef.meta as TableColumnMeta | undefined;
        const isSticky = meta?.sticky ?? false;
        const isLastBeforeActions =
          cellIndex === cells.length - 2 && lastCellId === "actions";

        const cellStyle: CSSProperties = {
          width: cell.column.getSize(),
          ...getStickyStyle(columnId),
          ...(isLastBeforeActions && !isSticky && { flex: 1 }),
        };

        const cellClassName = getStickyClassName(columnId, meta?.className);

        return (
          <TableCell
            className={cn(
              "flex h-full min-w-0 items-center overflow-hidden border-border border-b p-0 px-3",
              cellClassName,
              isSticky &&
                "bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#1A1A1A]"
            )}
            key={cell.id}
            onClick={() => {
              if (!nonClickableColumns.has(columnId)) {
                onCellClick?.(row.id, columnId);
              }
            }}
            style={cellStyle}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function arePropsEqual<TData>(
  prevProps: VirtualRowProps<TData>,
  nextProps: VirtualRowProps<TData>
): boolean {
  return (
    prevProps.row.id === nextProps.row.id &&
    prevProps.virtualStart === nextProps.virtualStart &&
    prevProps.rowHeight === nextProps.rowHeight &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.columnSizing === nextProps.columnSizing &&
    prevProps.columnOrder === nextProps.columnOrder &&
    prevProps.columnVisibility === nextProps.columnVisibility &&
    prevProps.row.original === nextProps.row.original
  );
}

export const VirtualRow = memo(VirtualRowInner, arePropsEqual) as <TData>(
  props: VirtualRowProps<TData>
) => React.JSX.Element;

export type { VirtualRowProps };
