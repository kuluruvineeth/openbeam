"use client";

import { Skeleton } from "@openbeam/ui";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="mb-4 h-6 w-40" />
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
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton className="h-12 w-full" key={i} />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton className="h-12 w-full" key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
