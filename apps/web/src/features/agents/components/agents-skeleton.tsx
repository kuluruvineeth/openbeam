"use client";

import { Skeleton } from "@openbeam/ui/components/skeleton";
import { cn } from "@openbeam/ui/utils";

function AgentItemSkeleton({ small }: { small?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-72 flex-col gap-3 border p-4",
        small && "h-48"
      )}
    >
      <Skeleton
        className={cn("h-[84px] w-[60px]", small && "h-[63px] w-[45px]")}
      />
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
      </div>
      {!small && (
        <div className="mt-auto flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      )}
    </div>
  );
}

function AgentsGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid 3xl:grid-cols-6 grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <AgentItemSkeleton key={index.toString()} />
      ))}
    </div>
  );
}

function AgentsHeaderSkeleton() {
  return (
    <div className="flex justify-between py-6">
      <Skeleton className="h-9 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

function AgentsTableSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="border">
      <div className="flex h-12 items-center border-b px-4">
        <Skeleton className="h-4 w-[200px]" />
        <div className="ml-auto flex gap-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="flex h-16 items-center border-b px-4 last:border-b-0"
          key={index.toString()}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-8">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentsPageSkeleton() {
  return (
    <div>
      <AgentsHeaderSkeleton />
      <AgentsGridSkeleton />
    </div>
  );
}

export {
  AgentItemSkeleton,
  AgentsGridSkeleton,
  AgentsHeaderSkeleton,
  AgentsPageSkeleton,
  AgentsTableSkeleton,
};
