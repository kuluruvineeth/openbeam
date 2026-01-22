"use client";

import { cn } from "@/lib/utils";
import type { SearchTiming } from "../types";

type TimingBreakdownProps = {
  timing: SearchTiming;
  className?: string;
};

export function TimingBreakdown({ timing, className }: TimingBreakdownProps) {
  return (
    <dl
      className={cn("min-w-[140px] space-y-1.5 font-mono text-xs", className)}
    >
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Embedding</dt>
        <dd className="tabular-nums">{timing.embeddingMs}ms</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Retrieval</dt>
        <dd className="tabular-nums">{timing.retrievalMs}ms</dd>
      </div>
      {timing.fusionMs > 0 && (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Fusion</dt>
          <dd className="tabular-nums">{timing.fusionMs}ms</dd>
        </div>
      )}
      <div className="flex justify-between gap-4 border-border/50 border-t pt-1.5">
        <dt className="font-medium">Total</dt>
        <dd className="font-medium tabular-nums">{timing.totalMs}ms</dd>
      </div>
    </dl>
  );
}
