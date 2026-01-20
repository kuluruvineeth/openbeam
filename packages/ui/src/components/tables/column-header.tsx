"use client";

import type { Column, SortDirection } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "../../utils/cn";

interface ColumnHeaderProps<T> {
  column: Column<T>;
  title: string;
  className?: string;
}

function SortIcon({ direction }: { direction: false | SortDirection }) {
  if (direction === "asc") {
    return <ArrowUp className="h-3 w-3" />;
  }
  if (direction === "desc") {
    return <ArrowDown className="h-3 w-3" />;
  }
  return <ArrowUpDown className="h-3 w-3 opacity-50" />;
}

function ColumnHeader<T>({ column, title, className }: ColumnHeaderProps<T>) {
  const sorted = column.getIsSorted();

  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  return (
    <button
      className={cn(
        "-ml-2 flex items-center gap-1 rounded-sm px-2 py-1",
        "transition-colors hover:bg-muted/50",
        "font-medium text-xs uppercase tracking-wider",
        className
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
      type="button"
    >
      {title}
      <SortIcon direction={sorted} />
    </button>
  );
}

export { ColumnHeader };
export type { ColumnHeaderProps };
