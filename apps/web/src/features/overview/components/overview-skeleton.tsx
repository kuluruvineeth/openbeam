"use client";

import { Skeleton } from "@openplane/ui";
import { cn } from "@/lib/utils";

type OverviewSkeletonProps = {
  className?: string;
};

export function OverviewSkeleton({ className }: OverviewSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[95%]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-4 w-[70%]" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-20 rounded-sm" />
        <Skeleton className="h-6 w-24 rounded-sm" />
        <Skeleton className="h-6 w-18 rounded-sm" />
      </div>
    </div>
  );
}
