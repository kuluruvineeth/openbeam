"use client";

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icons,
  Input,
} from "@openplane/ui";
import { cn } from "@openplane/ui/utils";
import {
  type MissionStatus,
  useMissionFilterParams,
} from "../hooks/use-mission-filter-params";

const STATUS_OPTIONS: { value: MissionStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ARCHIVED", label: "Archived" },
];

type MissionToolbarProps = {
  onCreateClick: () => void;
};

function MissionSearchFilter() {
  const { search, setSearch, status, toggleStatus, clearFilters } =
    useMissionFilterParams();

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-[250px]">
        <Icons.Search
          className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground"
          size={16}
        />
        <Input
          className="pr-9 pl-9"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search missions..."
          value={search}
        />
        {search && (
          <Button
            className="-translate-y-1/2 absolute top-1/2 right-1 size-6"
            onClick={() => setSearch("")}
            size="icon"
            variant="ghost"
          >
            <Icons.XIcon size={12} />
          </Button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn("gap-2", status.length > 0 && "border-primary")}
            variant="outline"
          >
            Status
            {status.length > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1" variant="secondary">
                {status.length}
              </Badge>
            )}
            <Icons.ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              checked={status.includes(option.value)}
              key={option.value}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <MissionFilterList
        filters={status.map((s) => ({
          id: s,
          label: STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
        }))}
        onClear={clearFilters}
        onRemove={(id) => toggleStatus(id as MissionStatus)}
      />
    </div>
  );
}

type Filter = {
  id: string;
  label: string;
};

type MissionFilterListProps = {
  filters: Filter[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

function MissionFilterList({
  filters,
  onRemove,
  onClear,
}: MissionFilterListProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {filters.map((filter) => (
        <Badge className="gap-1 pr-1 pl-2" key={filter.id} variant="secondary">
          {filter.label}
          <button
            className="rounded-full p-0.5 hover:bg-muted"
            onClick={() => onRemove(filter.id)}
            type="button"
          >
            <Icons.XIcon size={12} />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && (
        <Button
          className="h-6 text-muted-foreground text-xs"
          onClick={onClear}
          size="sm"
          variant="ghost"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}

function MissionViewSwitch() {
  const { viewMode, setViewMode } = useMissionFilterParams();

  return (
    <div className="flex gap-2 text-muted-foreground">
      <Button
        className={cn(viewMode === "card" && "border-primary text-primary")}
        onClick={() => setViewMode("card")}
        size="icon"
        variant="outline"
      >
        <Icons.Grid3x3 size={18} />
      </Button>
      <Button
        className={cn(viewMode === "table" && "border-primary text-primary")}
        onClick={() => setViewMode("table")}
        size="icon"
        variant="outline"
      >
        <Icons.List size={18} />
      </Button>
    </div>
  );
}

function MissionToolbar({ onCreateClick }: MissionToolbarProps) {
  return (
    <div className="flex justify-between py-6">
      <MissionSearchFilter />
      <div className="hidden space-x-2 md:flex">
        <MissionViewSwitch />
        <Button onClick={onCreateClick}>
          <Icons.Plus className="mr-2" size={16} />
          Create Mission
        </Button>
      </div>
    </div>
  );
}

export { MissionToolbar };
export type { MissionToolbarProps };
