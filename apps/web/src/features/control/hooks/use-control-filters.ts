"use client";

import type {
  ApprovalStatus,
  ControlAgentStatus,
  ControlIssueStatus,
  ControlProjectStatus,
} from "@openbeam/types/control";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";

type SortDirection = "asc" | "desc";
type ViewMode = "grid" | "table";

const sortDirParser = parseAsStringEnum<SortDirection>(["asc", "desc"]);
const viewModeParser = parseAsStringEnum<ViewMode>(["grid", "table"]);

const AGENT_STATUSES: ControlAgentStatus[] = [
  "ACTIVE",
  "IDLE",
  "RUNNING",
  "ERROR",
  "PAUSED",
  "PENDING_APPROVAL",
  "TERMINATED",
];

const ISSUE_STATUSES: ControlIssueStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
  "CANCELLED",
];

const PROJECT_STATUSES: ControlProjectStatus[] = [
  "BACKLOG",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const APPROVAL_STATUSES: ApprovalStatus[] = [
  "PENDING",
  "REVISION_REQUESTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

function useControlFilters<S extends string>(
  statusValues: readonly S[],
  defaultView: ViewMode = "table"
) {
  const parsers = {
    q: parseAsString.withDefault(""),
    status: parseAsArrayOf(
      parseAsStringEnum(statusValues as unknown as S[])
    ).withDefault([]),
    dir: sortDirParser.withDefault("desc"),
    view: viewModeParser.withDefault(defaultView),
  };

  const [filters, setFilters] = useQueryStates(parsers, {
    shallow: false,
    throttleMs: 300,
  });

  const setSearch = (value: string) => setFilters({ q: value || null });
  const toggleStatus = (status: S) => {
    const current = filters.status ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilters({ status: next.length > 0 ? next : null });
  };
  const setViewMode = (mode: ViewMode) => setFilters({ view: mode });
  const toggleSortDirection = () =>
    setFilters({ dir: filters.dir === "asc" ? "desc" : "asc" });
  const clearFilters = () => setFilters({ q: null, status: null, dir: null });

  const activeFilterCount = (filters.q ? 1 : 0) + (filters.status?.length ?? 0);

  return {
    search: filters.q,
    setSearch,
    statuses: (filters.status ?? []) as S[],
    toggleStatus,
    sortDirection: filters.dir,
    toggleSortDirection,
    viewMode: filters.view,
    setViewMode,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

export function useAgentFilters() {
  return useControlFilters(AGENT_STATUSES, "table");
}

export function useIssueFilters() {
  return useControlFilters(ISSUE_STATUSES, "table");
}

export function useProjectFilters() {
  return useControlFilters(PROJECT_STATUSES, "grid");
}

export function useApprovalFilters() {
  return useControlFilters(APPROVAL_STATUSES, "table");
}

export type { SortDirection, ViewMode };
