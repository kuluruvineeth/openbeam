"use client";

import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import { SearchMediaRow } from "@/components/search/search-media-row";
import { SearchResultRow } from "@/components/search/search-result-row";
import { TimingBreakdown } from "@/components/search/timing-breakdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PreviewType } from "@/hooks/use-document-preview";
import type {
  MediaDocument,
  SearchResultDocument,
  SearchTiming,
  UnifiedSearchItem,
} from "@/lib/search-types";

function formatResultCount(total: number): string {
  return total === 1 ? "1 result" : `${total.toLocaleString()} results`;
}

type SearchResultsProps = {
  items: UnifiedSearchItem[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  queryTime?: number;
  timing?: SearchTiming | null;
  total?: number;
  documentTotal?: number;
  mediaTotal?: number;
  selectedIndex?: number;
  previewId?: string | null;
  onSelectDocument?: (doc: SearchResultDocument, index: number) => void;
  onPreviewDocument?: (
    doc: SearchResultDocument,
    previewType: PreviewType
  ) => void;
  onSelectMedia?: (media: MediaDocument, index: number) => void;
  onPreviewMedia?: (media: MediaDocument) => void;
};

export function SearchResults({
  items,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  queryTime,
  timing,
  total,
  documentTotal,
  mediaTotal,
  selectedIndex = -1,
  previewId,
  onSelectDocument,
  onPreviewDocument,
  onSelectMedia,
  onPreviewMedia,
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

  const showDocMediaSplit =
    documentTotal !== undefined &&
    mediaTotal !== undefined &&
    documentTotal > 0 &&
    mediaTotal > 0;

  return (
    <div className="space-y-3">
      {(total !== undefined || queryTime !== undefined) && (
        <div className="flex items-center justify-between px-0.5 font-mono text-[10px]">
          {total !== undefined && (
            <span className="text-foreground/40 tabular-nums">
              {showDocMediaSplit ? (
                <>
                  <span>{documentTotal.toLocaleString()} docs</span>
                  <span className="mx-1.5 text-foreground/20">·</span>
                  <span>{mediaTotal.toLocaleString()} media</span>
                </>
              ) : (
                formatResultCount(total)
              )}
            </span>
          )}
          {queryTime !== undefined &&
            (timing ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <time className="cursor-help text-foreground/25 tabular-nums">
                      {queryTime}ms
                    </time>
                  </TooltipTrigger>
                  <TooltipContent
                    className="bg-background/95 backdrop-blur-lg"
                    side="bottom"
                    sideOffset={4}
                  >
                    <TimingBreakdown timing={timing} />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <time className="text-foreground/25 tabular-nums">
                {queryTime}ms
              </time>
            ))}
        </div>
      )}

      <ol
        aria-label="Search results"
        className="list-none border border-border/50"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isSelected = selectedIndex === index;
          const isPreviewing = previewId === item.data.id;

          if (item.type === "document") {
            return (
              <li key={`doc-${item.data.id}`}>
                <SearchResultRow
                  document={item.data}
                  isLast={isLast}
                  isPreviewing={isPreviewing}
                  isSelected={isSelected}
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
              </li>
            );
          }

          return (
            <li key={`media-${item.data.id}`}>
              <SearchMediaRow
                isLast={isLast}
                isPreviewing={isPreviewing}
                isSelected={isSelected}
                media={item.data}
                onPreview={onPreviewMedia}
                onSelect={(m) => onSelectMedia?.(m, index)}
                ref={(el) => {
                  if (el) {
                    rowRefs.current.set(index, el);
                  } else {
                    rowRefs.current.delete(index);
                  }
                }}
              />
            </li>
          );
        })}
      </ol>

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
