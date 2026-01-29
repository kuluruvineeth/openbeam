"use client";

import { Badge } from "@openplane/ui/components/badge";
import { Button } from "@openplane/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openplane/ui/components/dropdown-menu";
import { Input } from "@openplane/ui/components/input";
import { cn } from "@openplane/ui/utils";
import { ChevronDown, Search, X } from "lucide-react";
import { type AgentStatus, useAgentFilters } from "../hooks/use-agent-filters";
import { FilterList } from "./filter-list";

const STATUS_OPTIONS: { value: AgentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

export function AgentsSearchFilter() {
  const { search, setSearch, status, toggleStatus, clearFilters } =
    useAgentFilters();

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-[250px]">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          className="pr-9 pl-9"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents..."
          value={search}
        />
        {search && (
          <Button
            className="-translate-y-1/2 absolute top-1/2 right-1 size-6"
            onClick={() => setSearch("")}
            size="icon"
            variant="ghost"
          >
            <X className="size-3" />
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
            <ChevronDown className="size-4" />
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

      <FilterList
        filters={status.map((s) => ({
          id: s,
          label: STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
        }))}
        onClear={clearFilters}
        onRemove={(id) => toggleStatus(id as AgentStatus)}
      />
    </div>
  );
}
