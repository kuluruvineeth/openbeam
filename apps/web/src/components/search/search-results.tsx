"use client";

import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import type {
  SearchResultDocument,
  UnifiedSearchItem,
  VideoDocument,
} from "@/lib/search-types";
import { SearchResultRow } from "./search-result-row";
import { SearchVideoRow } from "./search-video-row";

function formatResultCount(total: number): string {
  return total === 1 ? "1 result" : `${total.toLocaleString()} results`;
}

type SearchResultsProps = {
  items: UnifiedSearchItem[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  queryTime?: number;
  total?: number;
  documentTotal?: number;
  videoTotal?: number;
  selectedIndex?: number;
  previewId?: string | null;
  onSelectDocument?: (doc: SearchResultDocument, index: number) => void;
  onPreviewDocument?: (doc: SearchResultDocument) => void;
  onSelectVideo?: (video: VideoDocument, index: number) => void;
  onPreviewVideo?: (video: VideoDocument) => void;
};

export function SearchResults({
  items,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  queryTime,
  total,
  documentTotal,
  videoTotal,
  selectedIndex = -1,
  previewId,
  onSelectDocument,
  onPreviewDocument,
  onSelectVideo,
  onPreviewVideo,
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

  const showDocVideoSplit =
    documentTotal !== undefined &&
    videoTotal !== undefined &&
    documentTotal > 0 &&
    videoTotal > 0;

  return (
    <div className="space-y-3">
      {(total !== undefined || queryTime !== undefined) && (
        <div className="flex items-center justify-between px-0.5 font-mono text-[10px]">
          {total !== undefined && (
            <span className="text-foreground/40 tabular-nums">
              {showDocVideoSplit ? (
                <>
                  <span>{documentTotal.toLocaleString()} docs</span>
                  <span className="mx-1.5 text-foreground/20">·</span>
                  <span>{videoTotal.toLocaleString()} videos</span>
                </>
              ) : (
                formatResultCount(total)
              )}
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
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isSelected = selectedIndex === index;
          const isPreviewing = previewId === item.data.id;

          if (item.type === "document") {
            return (
              <SearchResultRow
                document={item.data}
                isLast={isLast}
                isPreviewing={isPreviewing}
                isSelected={isSelected}
                key={`doc-${item.data.id}`}
                onPreview={onPreviewDocument}
                onSelect={(d) => onSelectDocument?.(d, index)}
                ref={(el) => {
                  if (el) {
                    rowRefs.current.set(index, el);
                  } else {
                    rowRefs.current.delete(index);
                  }
                }}
              />
            );
          }

          return (
            <SearchVideoRow
              isLast={isLast}
              isPreviewing={isPreviewing}
              isSelected={isSelected}
              key={`video-${item.data.id}`}
              onPreview={onPreviewVideo}
              onSelect={(v) => onSelectVideo?.(v, index)}
              ref={(el) => {
                if (el) {
                  rowRefs.current.set(index, el);
                } else {
                  rowRefs.current.delete(index);
                }
              }}
              video={item.data}
            />
          );
        })}
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
