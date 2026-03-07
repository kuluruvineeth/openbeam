"use client";

import { Skeleton } from "@openbeam/ui";
import { Icons } from "@/components/icons";
import { formatTime } from "@/lib/format";
import type { MediaHighlight } from "@/lib/media-types";
import { cn } from "@/lib/utils";

type HighlightsPanelProps = {
  highlights?: MediaHighlight[];
  currentTime: number;
  isLoading: boolean;
  onSeek: (time: number) => void;
};

export function HighlightsPanel({
  highlights,
  currentTime,
  isLoading,
  onSeek,
}: HighlightsPanelProps) {
  if (isLoading) {
    return <HighlightsSkeleton />;
  }

  if (!highlights?.length) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
          <div className="-translate-x-1/2 absolute top-1/4 left-1/4">
            <Icons.Sparkle size={80} />
          </div>
        </div>
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-3 flex size-9 items-center justify-center border border-border/40">
            <Icons.Sparkle className="text-foreground/25" size={18} />
          </div>
          <p className="font-medium text-[13px] text-foreground/60">
            No highlights available
          </p>
          <p className="mt-1 text-[11px] text-foreground/35">
            Key moments will appear after processing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {highlights.map((highlight, idx) => (
        <HighlightItem
          currentTime={currentTime}
          highlight={highlight}
          key={idx}
          onClick={() => onSeek(highlight.startSec)}
        />
      ))}
    </div>
  );
}

function HighlightItem({
  highlight,
  currentTime,
  onClick,
}: {
  highlight: MediaHighlight;
  currentTime: number;
  onClick: () => void;
}) {
  const isActive =
    currentTime >= highlight.startSec && currentTime < highlight.endSec;

  return (
    <button
      className={cn(
        "w-full border-border/40 border-b px-3 py-2.5 text-left transition-all last:border-b-0",
        isActive ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-[13px] text-foreground/90 leading-snug">
          {highlight.highlight}
        </p>
        <span className="shrink-0 bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-foreground/50 tabular-nums">
          {formatTime(highlight.startSec)}
        </span>
      </div>

      {highlight.summary && (
        <p className="mt-1 line-clamp-2 text-[11px] text-foreground/45 leading-relaxed">
          {highlight.summary}
        </p>
      )}
    </button>
  );
}

function HighlightsSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          className="border-border/40 border-b px-3 py-2.5 last:border-b-0"
          key={`highlight-skeleton-${i}`}
        >
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="mt-1.5 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
