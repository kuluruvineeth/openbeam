"use client";

import { Skeleton } from "@openbeam/ui";

export function IssuesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="rounded-sm border border-border/50">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            className="flex items-center gap-3 border-border/50 border-b px-4 py-3 last:border-b-0"
            key={i}
          >
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-6 w-6 rounded-sm" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
