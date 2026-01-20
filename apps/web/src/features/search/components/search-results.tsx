"use client";

import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Icons } from "@/components/icons";
import type { PreviewType } from "@/hooks/use-document-preview";
import type {
  MediaDocument,
  SearchResultDocument,
  UnifiedSearchItem,
} from "../types";
import { SearchMediaRow } from "./search-media-row";
import { SearchResultRow } from "./search-result-row";

type SearchResultsProps = {
  items: UnifiedSearchItem[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
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

  return (
    <div>
      <ol aria-label="Search results" className="list-none">
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
