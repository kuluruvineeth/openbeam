"use client";

import { Skeleton } from "@openbeam/ui";

export function ApprovalDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="space-y-3 rounded-sm border border-border/50 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div className="flex items-center gap-4" key={i}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-sm border border-border/50 p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}
