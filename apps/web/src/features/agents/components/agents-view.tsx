"use client";

import { useAgentFilters } from "../hooks/use-agent-filters";
import { useAgentParams } from "../hooks/use-agent-params";
import { AgentsGrid } from "./agents-grid";
import { AgentsTable } from "./agents-table";

export function AgentsView() {
  const { params } = useAgentParams();
  const { status, activeFilterCount, clearFilters } = useAgentFilters();

  if (params.view === "grid") {
    return (
      <AgentsGrid
        hasActiveFilters={activeFilterCount > 0}
        onClearFilters={clearFilters}
        status={status}
      />
    );
  }

  return (
    <AgentsTable
      hasActiveFilters={activeFilterCount > 0}
      onClearFilters={clearFilters}
      status={status}
    />
  );
}
