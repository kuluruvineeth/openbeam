"use client";

import { Skeleton } from "@openplane/ui";

export function MissionDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-border/50 border-b px-4 py-2.5">
        <Skeleton className="h-5 w-20" />
        <div className="h-4 w-px bg-border/50" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="ml-auto h-5 w-24" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-60 shrink-0 flex-col space-y-4 border-border/50 border-r p-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-1.5 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-1 border-border/50 border-b px-3 py-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton className="h-8 w-20" key={i} />
            ))}
          </div>
          <div className="flex-1 space-y-3 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-5/6" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-border/50 border-t px-4 py-2.5">
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
