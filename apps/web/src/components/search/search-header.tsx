"use client";

import { useSearch } from "@/hooks/use-search";

export function SearchHeader() {
  const { total, documentTotal, videoTotal, hasQuery, queryTime, isSearching } =
    useSearch();

  const showDocVideoSplit = documentTotal > 0 && videoTotal > 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[30px] leading-normal">Search</h1>
        {hasQuery && !isSearching && total > 0 && (
          <div className="flex items-center gap-2 font-mono text-sm">
            {showDocVideoSplit ? (
              <>
                <span className="text-foreground/70 tabular-nums">
                  {documentTotal.toLocaleString()}
                </span>
                <span className="text-foreground/40 text-xs">docs</span>
                <span className="text-foreground/20">·</span>
                <span className="text-foreground/70 tabular-nums">
                  {videoTotal.toLocaleString()}
                </span>
                <span className="text-foreground/40 text-xs">videos</span>
              </>
            ) : (
              <>
                <span className="text-foreground/70 tabular-nums">
                  {total.toLocaleString()}
                </span>
                <span className="text-foreground/40 text-xs">results</span>
              </>
            )}
            <span className="ml-2 text-[10px] text-foreground/25 tabular-nums">
              {queryTime}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
