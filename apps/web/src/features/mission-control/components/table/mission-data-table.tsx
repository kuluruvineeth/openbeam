"use client";

import { Checkbox } from "@openplane/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/utils";
import { type MissionRow, missionColumns } from "./mission-columns";
import { MissionVirtualRow } from "./mission-virtual-row";

const ROW_HEIGHT = 52;
const OVERSCAN = 5;

type MissionDataTableProps = {
  data: MissionRow[];
  hasMore: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onRowClick: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
};

function MissionDataTable({
  data,
  hasMore,
  fetchNextPage,
  isFetchingNextPage,
  onRowClick,
  selectedIds,
  onToggleSelection,
  onToggleAll,
}: MissionDataTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const allSelected = data.length > 0 && selectedIds.size === data.length;

  const containerHeight = scrollRef.current?.clientHeight ?? 600;
  const totalHeight = data.length * ROW_HEIGHT;

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN
    );
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2;
    const endIndex = Math.min(data.length - 1, startIndex + visibleCount);
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, data.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollRef.current;
    if (!(sentinel && container && hasMore) || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          fetchNextPage();
        }
      },
      { root: container, rootMargin: "100px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  useHotkeys("j", () => {
    setFocusedIndex((prev) => {
      const next = Math.min(prev + 1, data.length - 1);
      scrollRef.current?.scrollTo({
        top: next * ROW_HEIGHT - containerHeight / 2,
        behavior: "smooth",
      });
      return next;
    });
  }, [data.length, containerHeight]);

  useHotkeys("k", () => {
    setFocusedIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      scrollRef.current?.scrollTo({
        top: next * ROW_HEIGHT - containerHeight / 2,
        behavior: "smooth",
      });
      return next;
    });
  }, [containerHeight]);

  useHotkeys("enter", () => {
    const row = data[focusedIndex];
    if (row) {
      onRowClick(row.id);
    }
  }, [focusedIndex, data, onRowClick]);

  useHotkeys("x", () => {
    const row = data[focusedIndex];
    if (row) {
      onToggleSelection(row.id);
    }
  }, [focusedIndex, data, onToggleSelection]);

  const virtualRows: MissionRow[] = [];
  for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
    const row = data[i];
    if (row) {
      virtualRows.push(row);
    }
  }

  return (
    <div
      className="relative flex-1 overflow-auto"
      onScroll={handleScroll}
      ref={scrollRef}
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20 bg-background">
          <tr className="flex w-full">
            {missionColumns.map((col) => (
              <th
                className={cn(
                  "flex h-10 items-center border-border/50 border-b px-3 font-medium text-muted-foreground text-xs",
                  col.align === "right" && "justify-end"
                )}
                key={col.id}
                style={{
                  width: col.width === 0 ? undefined : col.width,
                  flex: col.width === 0 ? 1 : `0 0 ${col.width}px`,
                }}
              >
                {col.id === "select" ? (
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected}
                    onCheckedChange={() => onToggleAll()}
                  />
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="relative" style={{ height: totalHeight }}>
          {virtualRows.map((row) => {
            const index = data.indexOf(row);
            return (
              <MissionVirtualRow
                allSelected={allSelected}
                isFocused={index === focusedIndex}
                isSelected={selectedIds.has(row.id)}
                key={row.id}
                onClick={() => {
                  setFocusedIndex(index);
                  onRowClick(row.id);
                }}
                onToggleAll={onToggleAll}
                onToggleSelection={() => onToggleSelection(row.id)}
                row={row}
                style={{
                  height: ROW_HEIGHT,
                  transform: `translateY(${index * ROW_HEIGHT}px)`,
                }}
              />
            );
          })}
        </tbody>
      </table>

      {hasMore && (
        <div className="h-10" ref={sentinelRef}>
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-3 text-muted-foreground text-xs">
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { MissionDataTable };
export type { MissionDataTableProps };
