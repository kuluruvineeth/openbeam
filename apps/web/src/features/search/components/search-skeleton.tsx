"use client";

import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer rounded-sm bg-foreground/6", className)} />
  );
}

function SearchResultRowSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Shimmer className="size-7 shrink-0" />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Shimmer className="h-3 w-14" />
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-12" />
        </div>
        <Shimmer className="h-4 w-full max-w-md" />
        <Shimmer className="h-3 w-24" />
      </div>

      <Shimmer className="size-4 shrink-0" />
    </div>
  );
}

export function SearchResultsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultRowSkeleton delay={i * 50} key={i} />
      ))}
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="relative">
        <Shimmer className="h-12 w-full" />
      </div>

      <div className="flex items-center gap-3">
        <Shimmer className="h-8 w-16" />
        <Shimmer className="h-8 w-16" />
        <Shimmer className="h-8 w-20" />
        <div className="ml-auto flex items-center gap-2">
          <Shimmer className="h-8 w-24" />
        </div>
      </div>

      <SearchResultsSkeleton />
    </div>
  );
}
