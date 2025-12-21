"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SlackPreviewLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-border/50 border-b px-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="space-y-3 border-foreground/10 border-l-2 pl-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="flex items-start gap-2.5" key={i}>
              <Skeleton className="size-7 shrink-0 rounded" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-10" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
