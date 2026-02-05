"use client";

import type {
  TimelineFilter,
  TimelineStepStatus,
  TimelineViewMode,
} from "@openplane/types/canvas/timeline";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Icons } from "../icons";
import { Input } from "../input";
import { ToggleGroup, ToggleGroupItem } from "../toggle-group";

type TimelineControlsProps = React.ComponentProps<"div"> & {
  filter: TimelineFilter;
  viewMode: TimelineViewMode;
  onFilterChange: (filter: TimelineFilter) => void;
  onViewModeChange: (mode: TimelineViewMode) => void;
  showViewModeToggle?: boolean;
  showSearch?: boolean;
};

const statusOptions: { value: TimelineStepStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
  { value: "skipped", label: "Skipped" },
  { value: "cancelled", label: "Cancelled" },
];

const TimelineControls = forwardRef<HTMLDivElement, TimelineControlsProps>(
  (
    {
      filter,
      viewMode,
      onFilterChange,
      onViewModeChange,
      showViewModeToggle = true,
      showSearch = true,
      className,
      ...props
    },
    ref
  ) => {
    const updateFilter = (updates: Partial<TimelineFilter>) => {
      onFilterChange({ ...filter, ...updates });
    };

    const toggleStatus = (status: TimelineStepStatus) => {
      const currentStatuses = filter.status ?? [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((s) => s !== status)
        : [...currentStatuses, status];
      updateFilter({
        status: newStatuses.length > 0 ? newStatuses : undefined,
      });
    };

    const hasActiveFilters =
      (filter.status?.length ?? 0) > 0 ||
      (filter.nodeTypes?.length ?? 0) > 0 ||
      !filter.showSkipped ||
      filter.showRetries;

    return (
      <div
        className={cn("flex items-center gap-2", className)}
        ref={ref}
        {...props}
      >
        {showSearch && (
          <div className="relative flex-1">
            <Icons.Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              onChange={(e) =>
                updateFilter({ search: e.target.value || undefined })
              }
              placeholder="Search steps..."
              value={filter.search ?? ""}
            />
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                "h-8 gap-1.5",
                hasActiveFilters && "border-primary"
              )}
              size="sm"
              variant="outline"
            >
              <Icons.Filter className="size-3.5" />
              Filter
              {hasActiveFilters && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {(filter.status?.length ?? 0) +
                    (filter.nodeTypes?.length ?? 0)}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {statusOptions.map((option) => (
              <DropdownMenuCheckboxItem
                checked={filter.status?.includes(option.value) ?? false}
                key={option.value}
                onCheckedChange={() => toggleStatus(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Options</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filter.showSkipped}
              onCheckedChange={(checked) =>
                updateFilter({ showSkipped: checked })
              }
            >
              Show skipped
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter.showRetries}
              onCheckedChange={(checked) =>
                updateFilter({ showRetries: checked })
              }
            >
              Show retries
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showViewModeToggle && (
          <ToggleGroup
            className="h-8"
            onValueChange={(value) =>
              value && onViewModeChange(value as TimelineViewMode)
            }
            type="single"
            value={viewMode}
          >
            <ToggleGroupItem
              aria-label="List view"
              className="h-8 px-2"
              value="list"
            >
              <Icons.List className="size-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              aria-label="Gantt view"
              className="h-8 px-2"
              value="gantt"
            >
              <Icons.GanttChart className="size-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
    );
  }
);
TimelineControls.displayName = "TimelineControls";

export { TimelineControls };
export type { TimelineControlsProps };
