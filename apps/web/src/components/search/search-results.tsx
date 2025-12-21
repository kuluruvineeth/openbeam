"use client";

import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import type { PreviewType } from "@/hooks/use-document-preview";
import type {
  MediaDocument,
  SearchResultDocument,
  UnifiedSearchItem,
} from "@/lib/search-types";
import { SearchMediaRow } from "./search-media-row";
import { SearchResultRow } from "./search-result-row";

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
            <SearchMediaRow
              isLast={isLast}
              isPreviewing={isPreviewing}
              isSelected={isSelected}
              key={`media-${item.data.id}`}
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
