"use client";

import { Skeleton } from "@openbeam/ui";

export function CostsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-6 w-20" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            className="space-y-2 rounded-sm border border-border/50 p-4"
            key={i}
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton className="h-10 w-full" key={i} />
        ))}
      </div>
    </div>
  );
}
