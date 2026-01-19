"use client";

import { useMemo } from "react";

import type { FilterChip } from "./filter-chips";

interface DateRange {
  from: Date;
  to: Date;
}

interface FilterValues {
  search?: string;
  status?: string[];
  dateRange?: DateRange;
  tags?: string[];
  type?: string;
  [key: string]: unknown;
}

interface UseFilterChipsOptions {
  formatDate?: (date: Date) => string;
}

function formatDateDefault(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addSearchChip(chips: FilterChip[], search: string | undefined): void {
  if (search) {
    chips.push({
      id: "search",
      type: "search",
      label: String(search),
      value: search,
    });
  }
}

function addStatusChips(
  chips: FilterChip[],
  status: string[] | undefined
): void {
  if (status && Array.isArray(status)) {
    for (const s of status) {
      chips.push({ id: `status-${s}`, type: "status", label: s, value: s });
    }
  }
}

function addDateRangeChip(
  chips: FilterChip[],
  dateRange: DateRange | undefined,
  formatDate: (date: Date) => string
): void {
  if (dateRange) {
    chips.push({
      id: "date",
      type: "date",
      label: `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`,
      value: dateRange,
    });
  }
}

function addTagChips(chips: FilterChip[], tags: string[] | undefined): void {
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      chips.push({ id: `tag-${tag}`, type: "tag", label: tag, value: tag });
    }
  }
}

function addTypeChip(chips: FilterChip[], type: string | undefined): void {
  if (type) {
    chips.push({
      id: "type",
      type: "type",
      label: String(type),
      value: type,
    });
  }
}

function useFilterChips(
  filters: FilterValues,
  options: UseFilterChipsOptions = {}
): FilterChip[] {
  const { formatDate = formatDateDefault } = options;

  return useMemo(() => {
    const chips: FilterChip[] = [];
    addSearchChip(chips, filters.search);
    addStatusChips(chips, filters.status);
    addDateRangeChip(chips, filters.dateRange, formatDate);
    addTagChips(chips, filters.tags);
    addTypeChip(chips, filters.type);
    return chips;
  }, [filters, formatDate]);
}

export { useFilterChips };
export type { FilterValues, UseFilterChipsOptions };
