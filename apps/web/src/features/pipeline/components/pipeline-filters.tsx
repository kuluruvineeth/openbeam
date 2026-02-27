"use client";

import { cn, Icons, Input } from "@openplane/ui";
import { useCallback, useMemo } from "react";
import {
  extractUniqueAssignees,
  extractUniqueTags,
} from "../lib/pipeline-utils";
import { usePipelineStore } from "../stores/pipeline-store";
import type { PipelineCard } from "../types";

type PipelineFiltersProps = {
  cards: PipelineCard[];
  className?: string;
};

export function PipelineFilters({ cards, className }: PipelineFiltersProps) {
  const filters = usePipelineStore((s) => s.filters);
  const setSearch = usePipelineStore((s) => s.setSearch);
  const toggleTag = usePipelineStore((s) => s.toggleTag);
  const toggleAssignee = usePipelineStore((s) => s.toggleAssignee);
  const clearFilters = usePipelineStore((s) => s.clearFilters);

  const availableTags = useMemo(() => extractUniqueTags(cards), [cards]);
  const availableAssignees = useMemo(
    () => extractUniqueAssignees(cards),
    [cards]
  );

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.tags.length > 0 ||
    filters.assigneeIds.length > 0;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch]
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative">
        <Icons.Search
          className="-translate-y-1/2 absolute top-1/2 left-2.5 text-muted-foreground"
          size={14}
        />
        <Input
          className="h-8 w-48 pl-8 text-sm"
          onChange={handleSearchChange}
          placeholder="Filter cards..."
          value={filters.search}
        />
      </div>

      {availableTags.length > 0 && (
        <div className="flex items-center gap-1">
          <Icons.Tags className="text-muted-foreground" size={14} />
          {availableTags.slice(0, 5).map((tag) => (
            <button
              className={cn(
                "rounded-sm border px-2 py-0.5 text-[11px] transition-colors",
                filters.tags.includes(tag)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
              )}
              key={tag}
              onClick={() => toggleTag(tag)}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {availableAssignees.length > 0 && (
        <div className="flex items-center gap-1">
          <Icons.User className="text-muted-foreground" size={14} />
          {availableAssignees.slice(0, 4).map((assignee) => (
            <button
              className={cn(
                "rounded-sm border px-2 py-0.5 text-[11px] transition-colors",
                filters.assigneeIds.includes(assignee.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
              )}
              key={assignee.id}
              onClick={() => toggleAssignee(assignee.id)}
              type="button"
            >
              {assignee.name}
            </button>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <button
          className="flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={clearFilters}
          type="button"
        >
          <Icons.Close size={12} />
          Clear
        </button>
      )}
    </div>
  );
}
