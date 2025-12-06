"use client";

import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import type { SearchResultDocument } from "@/lib/search-types";
import { SearchResultRow } from "./search-result-row";

type SearchResultsProps = {
  documents: SearchResultDocument[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  queryTime?: number;
  total?: number;
  selectedIndex?: number;
  previewId?: string | null;
  onSelect?: (doc: SearchResultDocument, index: number) => void;
  onPreview?: (doc: SearchResultDocument) => void;
};

export function SearchResults({
  documents,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  queryTime,
  total,
  selectedIndex = -1,
  previewId,
  onSelect,
  onPreview,
}: SearchResultsProps) {
  const { ref, inView } = useInView();
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (selectedIndex >= 0 && rowRefs.current.has(selectedIndex)) {
      const row = rowRefs.current.get(selectedIndex);
      row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIndex]);

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
            isPreviewing={previewId === doc.id}
            isSelected={selectedIndex === index}
            key={doc.id}
            onPreview={onPreview}
            onSelect={(d) => onSelect?.(d, index)}
            ref={(el) => {
              if (el) {
                rowRefs.current.set(index, el);
              } else {
                rowRefs.current.delete(index);
              }
            }}
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
