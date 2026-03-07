"use client";

import { Skeleton } from "@openbeam/ui";

export function IssueDetailSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full rounded-sm" />
          <Skeleton className="h-20 w-full rounded-sm" />
        </div>
      </div>
      <div className="w-64 shrink-0 space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div className="flex items-center gap-4" key={i}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
