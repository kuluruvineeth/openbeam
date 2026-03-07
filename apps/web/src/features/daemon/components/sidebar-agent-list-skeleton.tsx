"use client";

import { cn } from "@openbeam/ui";

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-3 animate-pulse rounded bg-muted-foreground/10",
        className
      )}
    />
  );
}

function SkeletonSection({ opacity }: { opacity: number }) {
  return (
    <div className="px-2 py-1.5" style={{ opacity }}>
      <div className="mb-2 flex items-center gap-2 px-2">
        <SkeletonLine className="size-3.5 rounded-sm" />
        <SkeletonLine className="w-24" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div className="flex items-center gap-2 px-2 py-1.5" key={i}>
          <SkeletonLine className="size-2 rounded-full" />
          <SkeletonLine className="flex-1" />
          <SkeletonLine className="w-8" />
        </div>
      ))}
    </div>
  );
}

export function SidebarAgentListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden">
      <SkeletonSection opacity={1} />
      <SkeletonSection opacity={0.7} />
      <SkeletonSection opacity={0.4} />
    </div>
  );
}
