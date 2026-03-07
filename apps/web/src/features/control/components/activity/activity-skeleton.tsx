"use client";

import { Skeleton } from "@openbeam/ui";

export function ActivitySkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-1">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton className="h-10 w-full" key={i} />
        ))}
      </div>
    </div>
  );
}
