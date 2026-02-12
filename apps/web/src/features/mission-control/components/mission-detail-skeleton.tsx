"use client";

import { Skeleton } from "@openplane/ui";

export function MissionDetailSkeleton() {
  return (
    <div className="flex h-full flex-col dark:bg-[#0c0c0c]">
      <div className="flex items-center gap-3 border-border/50 border-b px-4 py-2.5 dark:border-[#1d1d1d]">
        <Skeleton className="h-5 w-20 rounded-sm" />
        <div className="h-4 w-px bg-border/50" />
        <Skeleton className="h-6 w-40 rounded-sm" />
        <Skeleton className="h-5 w-16 rounded-sm" />
        <Skeleton className="h-5 w-20 rounded-sm" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-5 w-14 rounded-sm" />
          <Skeleton className="h-5 w-24 rounded-sm" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[35%] shrink-0 flex-col border-border/50 border-r dark:border-[#1d1d1d]">
          <div className="flex items-center gap-2 border-border/50 border-b px-3 py-2 dark:border-[#1d1d1d]">
            <Skeleton className="h-4 w-16 rounded-sm" />
          </div>
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton className="h-20 w-full rounded-sm" key={i} />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 border-border/50 border-b px-3 py-2 dark:border-[#1d1d1d]">
            <Skeleton className="h-4 w-16 rounded-sm" />
          </div>
          <div className="flex-1 space-y-3 p-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton className="h-10 w-full rounded-sm" key={i} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-border/50 border-t px-4 py-2.5 dark:border-[#1d1d1d]">
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-20 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
