"use client";

import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import {
  DraggableHeader,
  ResizeHandle,
  type TableColumnMeta,
  TableHead,
  TableHeader,
  TableRow,
} from "@openplane/ui";
import type { Header, Table } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { MissionRow } from "./mission-columns";

interface MissionTableHeaderProps {
  table: Table<MissionRow>;
  getStickyStyle: (columnId: string) => CSSProperties;
  getStickyClassName: (columnId: string, baseClassName?: string) => string;
  nonReorderableColumns: Set<string>;
}

function MissionTableHeader({
  table,
  getStickyStyle,
  getStickyClassName,
  nonReorderableColumns,
}: MissionTableHeaderProps) {
  const headerGroup = table.getHeaderGroups()[0];
  if (!headerGroup) {
    return null;
  }

  const columnOrder = table
    .getAllLeafColumns()
    .map((col) => col.id)
    .filter((id) => !nonReorderableColumns.has(id));

  const headers = headerGroup.headers;
  const actionsIdx = headers.findIndex((h) => h.column.id === "actions");

  return (
    <TableHeader className="sticky top-0 z-20 block w-full border-0 bg-background">
      <SortableContext
        items={columnOrder}
        strategy={horizontalListSortingStrategy}
      >
        <TableRow className="!border-b-0 flex h-[45px] min-w-full items-center hover:bg-transparent">
          {headers.map((header, headerIndex) => {
            const columnId = header.column.id;
            const meta = header.column.columnDef.meta as
              | TableColumnMeta
              | undefined;
            const isReorderable = !nonReorderableColumns.has(columnId);
            const isLastBeforeActions =
              actionsIdx > 0 && headerIndex === actionsIdx - 1;

            const style: CSSProperties = {
              width: header.getSize(),
              minWidth: meta?.sticky
                ? header.getSize()
                : header.column.columnDef.minSize,
              maxWidth: meta?.sticky ? header.getSize() : undefined,
              ...getStickyStyle(columnId),
              ...(isLastBeforeActions && !meta?.sticky && { flex: 1 }),
            };

            const stickyClassName = getStickyClassName(columnId);

            return isReorderable ? (
              <DraggableHeader
                className={cn(
                  "text-muted-foreground text-xs",
                  stickyClassName,
                  meta?.sticky && "bg-background",
                  meta?.className
                )}
                id={columnId}
                key={header.id}
                style={style}
              >
                {renderHeaderContent(header)}
                <ResizeHandle header={header} />
              </DraggableHeader>
            ) : (
              <TableHead
                className={cn(
                  "flex h-full items-center border-border border-t p-0 px-3 text-muted-foreground text-xs",
                  stickyClassName,
                  meta?.sticky && "bg-background",
                  meta?.className
                )}
                key={header.id}
                style={style}
              >
                {renderHeaderContent(header)}
              </TableHead>
            );
          })}
        </TableRow>
      </SortableContext>
    </TableHeader>
  );
}

function renderHeaderContent<TData>(header: Header<TData, unknown>) {
  if (header.isPlaceholder) {
    return null;
  }
  return flexRender(header.column.columnDef.header, header.getContext());
}

export { MissionTableHeader };
