"use client";

import { Button } from "@openbeam/ui";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { ISSUE_STATUS_META } from "../../constants";
import { useIssueFilters } from "../../hooks/use-control-filters";
import { useControlIssues } from "../../hooks/use-control-issues";
import { FilterBar } from "../shared/filter-bar";
import { IssuesTable } from "./issues-table";
import { KanbanBoard } from "./kanban-board";
import { NewIssueDialog } from "./new-issue-dialog";

const STATUS_OPTIONS = Object.entries(ISSUE_STATUS_META).map(
  ([value, meta]) => ({
    value,
    label: meta.label,
  })
);

export function IssuesListView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const filters = useIssueFilters();
  const { issues, isLoading } = useControlIssues({
    status: filters.statuses.length === 1 ? filters.statuses[0] : undefined,
  });

  const filtered = issues.filter(
    (issue: { title: string; identifier: string | null; status: string }) => {
      if (
        filters.search &&
        !issue.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !(issue.identifier ?? "")
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.statuses.length > 1 &&
        !(filters.statuses as string[]).includes(issue.status)
      ) {
        return false;
      }
      return true;
    }
  );

  const sorted = [...filtered].sort(
    (a: { updatedAt: Date | string }, b: { updatedAt: Date | string }) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return filters.sortDirection === "desc" ? bTime - aTime : aTime - bTime;
    }
  );

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <FilterBar
        actions={
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Icons.Plus size={14} />
            New Issue
          </Button>
        }
        activeFilterCount={filters.activeFilterCount}
        activeStatuses={filters.statuses}
        onClearFilters={filters.clearFilters}
        onSearchChange={filters.setSearch}
        onStatusToggle={filters.toggleStatus as (status: string) => void}
        onViewModeChange={filters.setViewMode}
        search={filters.search}
        statusOptions={STATUS_OPTIONS}
        viewMode={filters.viewMode}
      />

      {filters.viewMode === "table" ? (
        <IssuesTable
          issues={sorted}
          onCreateClick={() => setDialogOpen(true)}
        />
      ) : (
        <KanbanBoard
          issues={sorted}
          onCreateClick={() => setDialogOpen(true)}
        />
      )}

      <NewIssueDialog onOpenChange={setDialogOpen} open={dialogOpen} />
    </div>
  );
}
