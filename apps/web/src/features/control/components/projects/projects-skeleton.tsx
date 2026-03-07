"use client";

import { Skeleton } from "@openbeam/ui";

function ProjectCardSkeleton() {
  return (
    <div className="space-y-3 rounded-sm border border-border/50 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-16 rounded-sm" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex items-center gap-3">
        <Skeleton className="size-6 rounded-sm" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
