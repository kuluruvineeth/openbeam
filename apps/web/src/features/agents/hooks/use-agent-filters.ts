"use client";

import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";

type AgentStatus = "active" | "draft" | "paused" | "archived";
type AgentSortField = "name" | "lastRun" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";
type AgentViewMode = "grid" | "table";

const agentStatusParser = parseAsArrayOf(
  parseAsStringEnum<AgentStatus>(["active", "draft", "paused", "archived"])
);

const sortFieldParser = parseAsStringEnum<AgentSortField>([
  "name",
  "lastRun",
  "createdAt",
  "updatedAt",
]);

const sortDirectionParser = parseAsStringEnum<SortDirection>(["asc", "desc"]);
const viewModeParser = parseAsStringEnum<AgentViewMode>(["grid", "table"]);

const agentFilterParsers = {
  q: parseAsString.withDefault(""),
  status: agentStatusParser.withDefault([]),
  sort: sortFieldParser.withDefault("updatedAt"),
  dir: sortDirectionParser.withDefault("desc"),
  view: viewModeParser.withDefault("grid"),
};

function useAgentFilters() {
  const [filters, setFilters] = useQueryStates(agentFilterParsers, {
    shallow: false,
    throttleMs: 300,
  });

  const setSearch = (value: string) => {
    setFilters({ q: value || null });
  };

  const setStatus = (value: AgentStatus[]) => {
    setFilters({ status: value.length > 0 ? value : null });
  };

  const toggleStatus = (status: AgentStatus) => {
    const current = filters.status ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setStatus(next);
  };

  const setSort = (field: AgentSortField, direction?: SortDirection) => {
    setFilters({
      sort: field,
      dir: direction ?? filters.dir,
    });
  };

  const toggleSortDirection = () => {
    setFilters({ dir: filters.dir === "asc" ? "desc" : "asc" });
  };

  const setViewMode = (mode: AgentViewMode) => {
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

export type { AgentSortField, AgentStatus, AgentViewMode, SortDirection };
export { useAgentFilters };
