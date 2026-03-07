"use client";

import { Button, Input } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statusOptions?: { value: string; label: string }[];
  activeStatuses?: string[];
  onStatusToggle?: (status: string) => void;
  viewMode?: "grid" | "table";
  onViewModeChange?: (mode: "grid" | "table") => void;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  actions?: React.ReactNode;
  className?: string;
};

export function FilterBar({
  search,
  onSearchChange,
  statusOptions,
  activeStatuses,
  onStatusToggle,
  viewMode,
  onViewModeChange,
  activeFilterCount = 0,
  onClearFilters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Icons.Search
          className="-translate-y-1/2 absolute top-1/2 left-2.5 text-muted-foreground"
          size={14}
        />
        <Input
          className="h-8 pl-8 text-sm"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          value={search}
        />
      </div>

      {statusOptions && onStatusToggle && (
        <div className="flex items-center gap-1">
          {statusOptions.map((opt) => {
            const isActive = activeStatuses?.includes(opt.value);
            return (
              <Button
                className={cn("h-7 text-xs", isActive && "bg-secondary")}
                key={opt.value}
                onClick={() => onStatusToggle(opt.value)}
                size="sm"
                variant="ghost"
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      )}

      {activeFilterCount > 0 && onClearFilters && (
        <Button
          className="h-7 text-xs"
          onClick={onClearFilters}
          size="sm"
          variant="ghost"
        >
          Clear ({activeFilterCount})
        </Button>
      )}

      {viewMode && onViewModeChange && (
        <div className="flex items-center rounded-sm border border-border/50">
          <button
            className={cn(
              "flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors",
              viewMode === "table" && "bg-secondary text-foreground"
            )}
            onClick={() => onViewModeChange("table")}
            type="button"
          >
            <Icons.List size={14} />
          </button>
          <button
            className={cn(
              "flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors",
              viewMode === "grid" && "bg-secondary text-foreground"
            )}
            onClick={() => onViewModeChange("grid")}
            type="button"
          >
            <Icons.LayoutGrid size={14} />
          </button>
        </div>
      )}

      {actions}
    </div>
  );
}
