"use client";

import { Skeleton } from "@openbeam/ui";

export function ApprovalsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            className="space-y-2 rounded-sm border border-border/50 p-4"
            key={i}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-3 w-72" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
