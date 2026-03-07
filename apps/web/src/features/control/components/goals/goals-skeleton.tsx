"use client";

import { Skeleton } from "@openbeam/ui";

export function GoalsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            className="flex items-center gap-2 rounded-sm border border-border/50 p-3"
            key={i}
          >
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-5 w-16 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
