"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function EmailPreviewLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-border/50 border-b px-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div className="space-y-3 border-border/40 border-b pb-4" key={i}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-48" />
              </div>
              <Skeleton className="ml-auto h-2.5 w-16" />
            </div>
            <div className="space-y-2 pl-11">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
