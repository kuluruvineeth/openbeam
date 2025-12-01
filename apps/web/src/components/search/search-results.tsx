"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import type { SearchResultDocument } from "@/hooks/use-search";
import { SearchResultRow } from "./search-result-row";

type SearchResultsProps = {
  documents: SearchResultDocument[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  queryTime?: number;
  total?: number;
};

export function SearchResults({
  documents,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  queryTime,
  total,
}: SearchResultsProps) {
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-3">
      {(total !== undefined || queryTime !== undefined) && (
        <div className="flex items-center justify-between px-0.5 font-mono text-[10px]">
          {total !== undefined && (
            <span className="text-foreground/40 tabular-nums">
              {total === 1 ? "1 result" : `${total.toLocaleString()} results`}
            </span>
          )}
          {queryTime !== undefined && (
            <span className="text-foreground/25 tabular-nums">
              {queryTime}ms
            </span>
          )}
        </div>
      )}

      <div className="border border-border/50">
        {documents.map((doc, index) => (
          <SearchResultRow
            document={doc}
            isLast={index === documents.length - 1}
            key={doc.id}
          />
        ))}
      </div>

      {(hasNextPage || isFetchingNextPage) && (
        <div className="flex justify-center py-3" ref={ref}>
          {isFetchingNextPage && (
            <Icons.Loader2Icon
              className="animate-spin text-foreground/30"
              size={14}
            />
          )}
        </div>
      )}
    </div>
  );
}
