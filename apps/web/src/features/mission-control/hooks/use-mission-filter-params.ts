"use client";

import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";

type MissionStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

type MissionSortField = "updatedAt" | "createdAt" | "name" | "status";
type SortDirection = "asc" | "desc";

const VIEW_MODES = ["table", "card"] as const;
type MissionViewMode = (typeof VIEW_MODES)[number];

const missionStatusParser = parseAsArrayOf(
  parseAsStringEnum<MissionStatus>([
    "DRAFT",
    "ACTIVE",
    "PAUSED",
    "COMPLETED",
    "CANCELLED",
    "ARCHIVED",
  ])
);

const sortFieldParser = parseAsStringEnum<MissionSortField>([
  "updatedAt",
  "createdAt",
  "name",
  "status",
]);

const sortDirectionParser = parseAsStringEnum<SortDirection>(["asc", "desc"]);

const missionFilterParams = {
  q: parseAsString.withDefault(""),
  status: missionStatusParser.withDefault([]),
  sort: sortFieldParser.withDefault("updatedAt"),
  dir: sortDirectionParser.withDefault("desc"),
  view: parseAsStringLiteral(VIEW_MODES).withDefault("table"),
};

function useMissionFilterParams() {
  const [filters, setFilters] = useQueryStates(missionFilterParams, {
    shallow: false,
    throttleMs: 300,
  });

  const setSearch = (value: string) => {
    setFilters({ q: value || null });
  };

  const setStatus = (value: MissionStatus[]) => {
    setFilters({ status: value.length > 0 ? value : null });
  };

  const toggleStatus = (status: MissionStatus) => {
    const current = filters.status ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setStatus(next);
  };

  const setSort = (field: MissionSortField, direction?: SortDirection) => {
    setFilters({
      sort: field,
      dir: direction ?? filters.dir,
    });
  };

  const toggleSortDirection = () => {
    setFilters({ dir: filters.dir === "asc" ? "desc" : "asc" });
  };

  const setViewMode = (mode: MissionViewMode) => {
    setFilters({ view: mode });
  };

  const clearFilters = () => {
    setFilters({
      q: null,
      status: null,
      sort: null,
      dir: null,
    });
  };

  const activeFilterCount = (filters.q ? 1 : 0) + (filters.status?.length ?? 0);

  return {
    search: filters.q,
    setSearch,
    status: filters.status ?? [],
    setStatus,
    toggleStatus,
    sortField: filters.sort,
    sortDirection: filters.dir,
    setSort,
    toggleSortDirection,
    viewMode: filters.view,
    setViewMode,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

export type { MissionSortField, MissionStatus, MissionViewMode, SortDirection };
export { missionFilterParams, useMissionFilterParams };
