"use client";

import { useSearch } from "@/hooks/use-search";

export function SearchHeader() {
  const { total, hasQuery, queryTime, isSearching } = useSearch();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[30px] leading-normal">Search</h1>
        {hasQuery && !isSearching && (
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm tabular-nums">
              {total.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-xs">results</span>
            <span className="text-[10px] text-muted-foreground/50">
              {queryTime}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
