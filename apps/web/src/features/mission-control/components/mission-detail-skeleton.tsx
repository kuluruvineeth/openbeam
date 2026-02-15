"use client";

import { Skeleton } from "@openplane/ui";

export function MissionDetailSkeleton() {
  return (
    <div className="flex h-full flex-col dark:bg-[#0c0c0c]">
      <div className="flex items-center gap-2 border-border/50 border-b px-4 py-1.5 dark:border-[#1d1d1d]">
        <Skeleton className="h-4 w-16 rounded-sm" />
        <div className="h-3.5 w-px bg-border/50" />
        <Skeleton className="h-5 w-48 rounded-sm" />
        <Skeleton className="h-4 w-14 rounded-sm" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-4 w-16 rounded-sm" />
          <Skeleton className="h-4 w-12 rounded-sm" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[280px] shrink-0 flex-col border-border/50 border-r dark:border-[#1d1d1d]">
          <div className="flex items-center gap-2 border-border/50 border-b px-3 py-2 dark:border-[#1d1d1d]">
            <Skeleton className="h-4 w-12 rounded-sm" />
            <Skeleton className="h-4 w-5 rounded-sm" />
          </div>
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton className="h-10 w-full rounded-sm" key={i} />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 border-border/50 border-b px-3 py-1.5 dark:border-[#1d1d1d]">
            <Skeleton className="h-4 w-10 rounded-sm" />
            <Skeleton className="h-4 w-5 rounded-sm" />
          </div>
          <div className="flex flex-1 gap-2 p-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                className="flex w-[220px] shrink-0 flex-col gap-1.5 rounded-sm border border-border/30 p-1.5"
                key={i}
              >
                <Skeleton className="h-3 w-14 rounded-sm" />
                <Skeleton className="h-8 w-full rounded-sm" />
                <Skeleton className="h-8 w-full rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-[420px] shrink-0 flex-col border-border/50 border-l dark:border-[#1d1d1d]">
          <div className="flex items-center gap-2 border-border/50 border-b px-3 py-1.5 dark:border-[#1d1d1d]">
            <Skeleton className="h-4 w-10 rounded-sm" />
          </div>
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton className="h-12 w-full rounded-sm" key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
