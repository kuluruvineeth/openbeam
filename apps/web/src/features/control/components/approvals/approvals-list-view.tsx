"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { APPROVAL_STATUS_META } from "../../constants";
import { useControlApprovals } from "../../hooks/use-control-approvals";
import { useApprovalFilters } from "../../hooks/use-control-filters";
import { EmptyState } from "../shared/empty-state";
import { FilterBar } from "../shared/filter-bar";
import { ApprovalCard } from "./approval-card";
import { ApprovalsSkeleton } from "./approvals-skeleton";

const TYPE_LABELS: Record<string, string> = {
  HIRE_AGENT: "Hire Agent",
  APPROVE_CEO_STRATEGY: "CEO Strategy",
};

const STATUS_OPTIONS = Object.entries(APPROVAL_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export function ApprovalsListView() {
  const filters = useApprovalFilters();
  const { data: approvals, isLoading } = useControlApprovals();

  if (isLoading) {
    return <ApprovalsSkeleton />;
  }

  const items = approvals ?? [];

  const filtered = items.filter((a) => {
    const label = TYPE_LABELS[a.type] ?? a.type;
    if (
      filters.search &&
      !label.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(a.status)) {
      return false;
    }
    return true;
  });

  const pendingItems = filtered.filter(
    (a) => a.status === "PENDING" || a.status === "REVISION_REQUESTED"
  );

  return (
    <div className="space-y-4 p-6">
      <h1 className="font-semibold text-lg">Approvals</h1>

      <FilterBar
        activeFilterCount={filters.activeFilterCount}
        activeStatuses={filters.statuses}
        onClearFilters={filters.clearFilters}
        onSearchChange={filters.setSearch}
        onStatusToggle={filters.toggleStatus as (status: string) => void}
        search={filters.search}
        statusOptions={STATUS_OPTIONS}
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-3 space-y-2" value="pending">
          {pendingItems.length === 0 ? (
            <EmptyState
              description="No approvals require your attention"
              icon={<Icons.Check size={24} />}
              title="All clear"
            />
          ) : (
            pendingItems.map((a) => (
              <ApprovalCard
                approval={{ ...a, title: TYPE_LABELS[a.type] ?? a.type }}
                key={a.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent className="mt-3 space-y-2" value="all">
          {filtered.length === 0 ? (
            <EmptyState
              description="No approvals match your filters"
              icon={<Icons.Search size={24} />}
              title="No approvals found"
            />
          ) : (
            filtered.map((a) => (
              <ApprovalCard
                approval={{ ...a, title: TYPE_LABELS[a.type] ?? a.type }}
                key={a.id}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
