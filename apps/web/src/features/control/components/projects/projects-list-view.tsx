"use client";

import { Icons } from "@/components/icons";
import { PROJECT_STATUS_META } from "../../constants";
import { useProjectFilters } from "../../hooks/use-control-filters";
import { useControlProjects } from "../../hooks/use-control-projects";
import { EmptyState } from "../shared/empty-state";
import { FilterBar } from "../shared/filter-bar";
import { NewProjectDialog } from "./new-project-dialog";
import { ProjectCard } from "./project-card";

const STATUS_OPTIONS = Object.entries(PROJECT_STATUS_META).map(
  ([value, meta]) => ({ value, label: meta.label })
);

export function ProjectsListView() {
  const { data: projects, isLoading } = useControlProjects();
  const filters = useProjectFilters();

  const statusSet = new Set<string>(filters.statuses);
  const filtered = (projects ?? []).filter((p) => {
    if (
      filters.search &&
      !p.name.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    if (statusSet.size > 0 && !statusSet.has(p.status)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-lg">Projects</h1>
        <NewProjectDialog />
      </div>

      <FilterBar
        activeFilterCount={filters.activeFilterCount}
        activeStatuses={filters.statuses}
        onClearFilters={filters.clearFilters}
        onSearchChange={filters.setSearch}
        onStatusToggle={filters.toggleStatus as (status: string) => void}
        search={filters.search}
        statusOptions={STATUS_OPTIONS}
      />

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          description="Create a project to organize agent work"
          icon={<Icons.Folder size={32} />}
          title="No projects"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
