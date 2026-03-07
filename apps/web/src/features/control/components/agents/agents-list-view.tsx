"use client";

import { Button } from "@openbeam/ui";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { AGENT_STATUS_META } from "../../constants";
import { useControlAgents } from "../../hooks/use-control-agents";
import { useAgentFilters } from "../../hooks/use-control-filters";
import { EmptyState } from "../shared/empty-state";
import { FilterBar } from "../shared/filter-bar";
import { AgentCard } from "./agent-card";
import { AgentsTable } from "./agents-table";
import { NewAgentDialog } from "./new-agent-dialog";

export function AgentsListView() {
  const filters = useAgentFilters();
  const { agents, count, isLoading } = useControlAgents();
  const [dialogOpen, setDialogOpen] = useState(false);

  const statusOptions = Object.entries(AGENT_STATUS_META).map(
    ([value, meta]) => ({
      value,
      label: meta.label,
    })
  );

  const filtered = agents.filter((agent) => {
    if (
      filters.search &&
      !agent.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.statuses.length > 0 &&
      !filters.statuses.includes(agent.status)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">Agents</h1>
          <p className="text-muted-foreground text-xs">{count} total</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Icons.Plus size={14} />
          New Agent
        </Button>
      </div>

      <FilterBar
        activeFilterCount={filters.activeFilterCount}
        activeStatuses={filters.statuses}
        onClearFilters={filters.clearFilters}
        onSearchChange={filters.setSearch}
        onStatusToggle={filters.toggleStatus as (status: string) => void}
        onViewModeChange={filters.setViewMode}
        search={filters.search}
        statusOptions={statusOptions}
        viewMode={filters.viewMode}
      />

      {filtered.length === 0 && !isLoading && (
        <EmptyState
          action={{
            label: "Create Agent",
            onClick: () => setDialogOpen(true),
          }}
          description="No agents match your filters, or none have been created yet."
          icon={<Icons.BotIcon size={24} />}
          title="No agents found"
        />
      )}
      {filtered.length > 0 && filters.viewMode === "table" && (
        <AgentsTable agents={filtered} />
      )}
      {filtered.length > 0 && filters.viewMode !== "table" && (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((agent) => (
            <AgentCard agent={agent} key={agent.id} />
          ))}
        </div>
      )}

      <NewAgentDialog onOpenChange={setDialogOpen} open={dialogOpen} />
    </div>
  );
}
