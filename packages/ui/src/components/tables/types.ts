import type { ColumnDef } from "@tanstack/react-table";
import type { RefObject } from "react";

const UNDERSCORE_RE = /_/g;
const CAMEL_CASE_RE = /([A-Z])/g;
const FIRST_CHAR_RE = /^./;

export interface TableScrollState {
  containerRef: RefObject<HTMLDivElement | null>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isScrollable: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
}

export interface StickyColumnConfig {
  id: string;
  width: number;
}

export interface TableColumnMeta {
  className?: string;
  sticky?: boolean;
  sortField?: string;
  headerLabel?: string;
}

export interface TableConfig {
  stickyColumns: StickyColumnConfig[];
  sortFieldMap: Record<string, string>;
  nonReorderableColumns: Set<string>;
  rowHeight: number;
}

export function getColumnId<T>(col: ColumnDef<T>): string {
  return col.id || (col as { accessorKey?: string }).accessorKey || "";
}

export function getHeaderLabel<T>(col: ColumnDef<T>): string {
  const meta = col.meta as TableColumnMeta | undefined;
  if (meta?.headerLabel) {
    return meta.headerLabel;
  }

  const id = getColumnId(col);
  return id
    .replace(UNDERSCORE_RE, " ")
    .replace(CAMEL_CASE_RE, " $1")
    .replace(FIRST_CHAR_RE, (str) => str.toUpperCase())
    .trim();
}
