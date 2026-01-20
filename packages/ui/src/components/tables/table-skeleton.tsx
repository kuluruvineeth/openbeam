"use client";

import { cn } from "../../utils/cn";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  rowHeight?: number;
  className?: string;
}

function TableSkeleton({
  rows = 10,
  columns: columnCount = 5,
  rowHeight = 45,
  className,
}: TableSkeletonProps) {
  const headerCells = Array.from({ length: columnCount }, (_, i) => i);
  const rowCells = Array.from({ length: rows }, (_, i) => i);
  const columnCells = Array.from({ length: columnCount }, (_, i) => i);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-10 border-border/50 border-b">
        {headerCells.map((headerIdx) => (
          <div
            className="flex flex-1 items-center px-3"
            key={`header-${headerIdx}`}
            style={{ minWidth: 120 }}
          >
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      {rowCells.map((rowIdx) => (
        <div
          className="flex border-border/30 border-b"
          key={`row-${rowIdx}`}
          style={{ height: rowHeight }}
        >
          {columnCells.map((colIdx) => (
            <div
              className="flex flex-1 items-center px-3"
              key={`cell-${rowIdx}-${colIdx}`}
              style={{ minWidth: 120 }}
            >
              <div
                className={cn(
                  "h-4 animate-pulse rounded bg-muted",
                  colIdx === 0 ? "w-32" : "w-20"
                )}
                style={{
                  animationDelay: `${(rowIdx * columnCount + colIdx) * 50}ms`,
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export { TableSkeleton };
export type { TableSkeletonProps };
