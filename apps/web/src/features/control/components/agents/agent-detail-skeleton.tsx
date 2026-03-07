"use client";

import { Skeleton } from "@openbeam/ui";

export function AgentDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-sm" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton className="h-8 w-20" key={i} />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton className="h-8 w-full" key={i} />
        ))}
      </div>
    </div>
  );
}
