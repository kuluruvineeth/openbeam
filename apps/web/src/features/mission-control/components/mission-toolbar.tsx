"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Icons,
  Input,
} from "@openplane/ui";
import { cva } from "class-variance-authority";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMissionFilterParams } from "../hooks/use-mission-filter-params";
import { useMissionListStore } from "../stores/mission-list-store";

const viewToggleVariants = cva(
  "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent text-accent-foreground",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      },
    },
  }
);

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Updated" },
  { value: "createdAt", label: "Created" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
] as const;

const DEBOUNCE_MS = 300;

type MissionToolbarProps = {
  onCreateClick: () => void;
  resultCount?: number;
};

function MissionToolbar({ onCreateClick, resultCount }: MissionToolbarProps) {
  const [params, setParams] = useMissionFilterParams();
  const viewMode = useMissionListStore((s) => s.viewMode);
  const setViewMode = useMissionListStore((s) => s.setViewMode);
  const sortField = useMissionListStore((s) => s.sortField);
  const sortDirection = useMissionListStore((s) => s.sortDirection);
  const setSortField = useMissionListStore((s) => s.setSortField);
  const setSortDirection = useMissionListStore((s) => s.setSortDirection);

  const [localSearch, setLocalSearch] = useState(params.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setLocalSearch(params.search);
  }, [params.search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setParams({ search: value || null });
      }, DEBOUNCE_MS);
    },
    [setParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      const field = value as typeof sortField;
      setSortField(field);
      setParams({ sort: field });
    },
    [setSortField, setParams]
  );

  const toggleSortDirection = useCallback(() => {
    const next = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(next);
    setParams({ order: next });
  }, [sortDirection, setSortDirection, setParams]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative max-w-xs flex-1">
        <Icons.Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search missions..."
          value={localSearch}
        />
      </div>

      {resultCount !== undefined && (
        <span className="text-muted-foreground text-xs tabular-nums">
          {resultCount} results
        </span>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost">
          <Icons.Filter className="mr-1.5 h-3.5 w-3.5" />
          Filter
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <Icons.ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              onValueChange={handleSortChange}
              value={sortField}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          className="h-7 w-7"
          onClick={toggleSortDirection}
          size="icon"
          variant="ghost"
        >
          {sortDirection === "asc" ? (
            <Icons.ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <Icons.ArrowDown className="h-3.5 w-3.5" />
          )}
        </Button>

        <div className="flex items-center rounded-sm border border-border/50">
          <button
            className={viewToggleVariants({ active: viewMode === "table" })}
            onClick={() => setViewMode("table")}
            type="button"
          >
            <Icons.List className="h-3.5 w-3.5" />
          </button>
          <button
            className={viewToggleVariants({ active: viewMode === "card" })}
            onClick={() => setViewMode("card")}
            type="button"
          >
            <Icons.LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>

        <Button onClick={onCreateClick} size="sm">
          <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />
          Create Mission
        </Button>
      </div>
    </div>
  );
}

export { MissionToolbar, viewToggleVariants };
export type { MissionToolbarProps };
