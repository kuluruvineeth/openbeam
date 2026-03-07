"use client";

import { Skeleton } from "@openbeam/ui";

export function AgentsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton className="h-12 w-full" key={i} />
        ))}
      </div>
    </div>
  );
}
