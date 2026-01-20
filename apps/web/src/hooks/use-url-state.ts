"use client";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs";

export type SortDirection = "asc" | "desc";
export type ViewMode = "table" | "grid" | "kanban" | "calendar";

const sortDirectionParser = parseAsStringEnum<SortDirection>(["asc", "desc"]);
const viewModeParser = parseAsStringEnum<ViewMode>([
  "table",
  "grid",
  "kanban",
  "calendar",
]);

export function useUrlState() {
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ shallow: false })
  );
  const [page, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false })
  );
  const [pageSize, setPageSize] = useQueryState(
    "size",
    parseAsInteger.withDefault(25).withOptions({ shallow: false })
  );
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsString.withDefault("updatedAt").withOptions({ shallow: false })
  );
  const [sortDir, setSortDir] = useQueryState(
    "dir",
    sortDirectionParser.withDefault("desc").withOptions({ shallow: false })
  );
  const [view, setView] = useQueryState(
    "view",
    viewModeParser.withDefault("table").withOptions({ shallow: false })
  );
  const [statuses, setStatuses] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString)
      .withDefault([])
      .withOptions({ shallow: false })
  );
  const [selectedId, setSelectedId] = useQueryState(
    "selected",
    parseAsString.withOptions({ shallow: false })
  );
  const [isOpen, setIsOpen] = useQueryState(
    "open",
    parseAsBoolean.withDefault(false).withOptions({ shallow: false })
  );

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    view,
    setView,
    statuses,
    setStatuses,
    selectedId,
    setSelectedId,
    isOpen,
    setIsOpen,
  };
}

export function useUrlFilters<T extends Parameters<typeof useQueryStates>[0]>(
  parsers: T,
  options?: { throttleMs?: number }
) {
  const [filters, setFilters] = useQueryStates(parsers, {
    shallow: false,
    throttleMs: options?.throttleMs ?? 300,
  });

  const clearFilters = () => {
    const cleared = Object.fromEntries(
      Object.keys(parsers).map((key) => [key, null])
    ) as Parameters<typeof setFilters>[0];
    setFilters(cleared);
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== null && v !== "" && v !== undefined
  ).length;

  return {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

export {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
};
