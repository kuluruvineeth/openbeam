"use client";

import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openplane/ui";
import { type ReactNode, useState } from "react";
import { useMissionFilterParams } from "../hooks/use-mission-filter-params";

const FILTERABLE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

type FilterState = {
  statuses: Set<string>;
  dateFrom: string;
  dateTo: string;
  costMin: string;
  costMax: string;
};

const INITIAL_FILTER: FilterState = {
  statuses: new Set(),
  dateFrom: "",
  dateTo: "",
  costMin: "",
  costMax: "",
};

type MissionFilterPopoverProps = {
  trigger: ReactNode;
};

export function MissionFilterPopover({ trigger }: MissionFilterPopoverProps) {
  const { setStatus, clearFilters: clearParamFilters } =
    useMissionFilterParams();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER);

  function toggleStatus(status: string) {
    setFilters((prev) => {
      const next = new Set(prev.statuses);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return { ...prev, statuses: next };
    });
  }

  function handleApply() {
    const statusArr = Array.from(filters.statuses) as Parameters<
      typeof setStatus
    >[0];
    setStatus(statusArr);
    setOpen(false);
  }

  function handleClear() {
    setFilters(INITIAL_FILTER);
    clearParamFilters();
    setOpen(false);
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="flex flex-col gap-4">
          <div>
            <Label className="mb-2 block font-medium text-xs">Status</Label>
            <div className="flex flex-col gap-1.5">
              {FILTERABLE_STATUSES.map((status) => (
                <div
                  className="flex cursor-pointer items-center gap-2 text-sm"
                  key={status}
                >
                  <Checkbox
                    checked={filters.statuses.has(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block font-medium text-xs">Date Range</Label>
            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  setFilters((p) => ({ ...p, dateFrom: e.target.value }))
                }
                placeholder="From"
                type="date"
                value={filters.dateFrom}
              />
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  setFilters((p) => ({ ...p, dateTo: e.target.value }))
                }
                placeholder="To"
                type="date"
                value={filters.dateTo}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block font-medium text-xs">
              Cost Range ($)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  setFilters((p) => ({ ...p, costMin: e.target.value }))
                }
                placeholder="Min"
                type="number"
                value={filters.costMin}
              />
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  setFilters((p) => ({ ...p, costMax: e.target.value }))
                }
                placeholder="Max"
                type="number"
                value={filters.costMax}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-border/50 border-t pt-3">
            <Button onClick={handleClear} size="sm" variant="ghost">
              Clear
            </Button>
            <Button onClick={handleApply} size="sm">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
