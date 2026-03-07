"use client";

import { Skeleton } from "@openbeam/ui";

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-20 rounded-sm" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-24 w-full rounded-sm" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full rounded-sm" />
            <Skeleton className="h-16 w-full rounded-sm" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="flex gap-4" key={i}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
