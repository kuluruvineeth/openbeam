"use client";

import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";

type SummaryPanelProps = {
  summary?: string;
  isLoading: boolean;
};

export function AudioSummaryPanel({ summary, isLoading }: SummaryPanelProps) {
  if (isLoading) {
    return <SummarySkeleton />;
  }

  if (!summary) {
    return <EmptySummary />;
  }

  return (
    <div className="p-3">
      <h3 className="mb-1.5 font-medium text-[11px] text-foreground/70 uppercase tracking-wider">
        Summary
      </h3>
      <p className="text-[13px] text-foreground/80 leading-relaxed">
        {summary}
      </p>
    </div>
  );
}

function EmptySummary() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
        <div className="-translate-x-1/2 absolute top-1/4 left-1/4">
          <Icons.BookOpen size={80} />
        </div>
      </div>
      <div className="relative z-10 text-center">
        <div className="mx-auto mb-3 flex size-9 items-center justify-center border border-border/40">
          <Icons.BookOpen className="text-foreground/25" size={18} />
        </div>
        <p className="font-medium text-[13px] text-foreground/60">
          No summary available
        </p>
        <p className="mt-1 text-[11px] text-foreground/35">
          Summary will appear after processing
        </p>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-2 p-3">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
