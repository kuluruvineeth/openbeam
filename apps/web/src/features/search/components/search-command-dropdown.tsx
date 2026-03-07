"use client";

import { Skeleton } from "@openbeam/ui";
import { Command as CommandPrimitive } from "cmdk";
import { Icons } from "@/components/icons";
import type { UnifiedSearchItem } from "../types";
import { SearchCommandItem } from "./search-command-item";

type Props = {
  items: UnifiedSearchItem[];
  isFetching: boolean;
  onSelect: (item: UnifiedSearchItem) => void;
  onExpandAll: () => void;
};

function DropdownSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          className="flex items-center gap-3 px-2 py-1.5"
          key={`cmd-skeleton-${i}`}
        >
          <Skeleton className="size-7" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function DropdownEmpty() {
  return (
    <div className="flex flex-col items-center gap-1 py-8">
      <Icons.Search className="text-foreground/20" size={20} />
      <span className="text-foreground/50 text-xs">No results found</span>
      <span className="text-[10px] text-foreground/30">
        Press Enter to search everything
      </span>
    </div>
  );
}

function DropdownFooter({ onExpandAll }: { onExpandAll: () => void }) {
  return (
    <div className="flex items-center justify-between border-border/40 border-t px-3 py-2">
      <div className="flex items-center gap-3 font-mono text-[10px] text-foreground/40">
        <span className="flex items-center gap-1">
          <kbd className="border border-border/50 bg-foreground/3 px-1">↑↓</kbd>
          navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="border border-border/50 bg-foreground/3 px-1">↵</kbd>
          select
        </span>
      </div>
      <button
        className="font-mono text-[10px] text-foreground/50 transition-colors hover:text-foreground/70"
        onClick={onExpandAll}
        type="button"
      >
        View all results →
      </button>
    </div>
  );
}

export function SearchCommandDropdown({
  items,
  isFetching,
  onSelect,
  onExpandAll,
}: Props) {
  return (
    <div className="absolute top-full right-0 left-0 z-50 border border-border/50 border-t-0 bg-background">
      <CommandPrimitive.List className="max-h-[320px] overflow-y-auto overflow-x-hidden">
        {isFetching && <DropdownSkeleton />}
        {!isFetching && items.length === 0 && (
          <CommandPrimitive.Empty asChild>
            <DropdownEmpty />
          </CommandPrimitive.Empty>
        )}
        {!isFetching && items.length > 0 && (
          <CommandPrimitive.Group>
            {items.map((item) => (
              <SearchCommandItem
                item={item}
                key={item.data.id}
                onSelect={() => onSelect(item)}
              />
            ))}
          </CommandPrimitive.Group>
        )}
      </CommandPrimitive.List>
      <DropdownFooter onExpandAll={onExpandAll} />
    </div>
  );
}
