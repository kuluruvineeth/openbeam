"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format";
import type { TranscriptSegment } from "@/lib/media-types";
import { type GroupedSegment, groupSegments } from "@/lib/transcript-utils";
import { cn } from "@/lib/utils";

type TranscriptPanelProps = {
  segments?: TranscriptSegment[];
  currentTime: number;
  isLoading: boolean;
  onSeek: (time: number) => void;
};

export function TranscriptPanel({
  segments,
  currentTime,
  isLoading,
  onSeek,
}: TranscriptPanelProps) {
  const [search, setSearch] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);

  const groupedSegments = useMemo(
    () => (segments ? groupSegments(segments) : []),
    [segments]
  );

  const activeIndex = groupedSegments.findIndex(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  useEffect(() => {
    if (activeIndex >= 0 && activeRef.current && !search) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex, search]);

  if (isLoading) {
    return <TranscriptSkeleton />;
  }

  if (!groupedSegments.length) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.02]">
          <div className="-translate-x-1/2 absolute top-1/4 left-1/4">
            <Icons.Text size={80} />
          </div>
        </div>
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-3 flex size-9 items-center justify-center border border-border/40">
            <Icons.Text className="text-foreground/25" size={18} />
          </div>
          <p className="font-medium text-[13px] text-foreground/60">
            No transcript available
          </p>
          <p className="mt-1 text-[11px] text-foreground/35">
            Transcript will appear after processing
          </p>
        </div>
      </div>
    );
  }

  const filtered = search
    ? groupedSegments.filter((s) =>
        s.words.some((w) =>
          w.value.toLowerCase().includes(search.toLowerCase())
        )
      )
    : groupedSegments;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-border/40 border-b p-2">
        <div className="relative">
          <Icons.Search className="-translate-y-1/2 absolute top-1/2 left-2 size-3.5 text-foreground/40" />
          <Input
            className="h-7 pl-7 text-[12px]"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcript..."
            value={search}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col">
          {filtered.map((segment, idx) => {
            const originalIdx = groupedSegments.indexOf(segment);
            const isActive = originalIdx === activeIndex && !search;
            return (
              <TranscriptLine
                currentTime={currentTime}
                isActive={isActive}
                key={idx}
                onClick={() => onSeek(segment.start)}
                ref={isActive ? activeRef : null}
                searchTerm={search}
                segment={segment}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type TranscriptLineProps = {
  segment: GroupedSegment;
  currentTime: number;
  isActive: boolean;
  searchTerm?: string;
  onClick: () => void;
};

const TranscriptLine = forwardRef<HTMLButtonElement, TranscriptLineProps>(
  ({ segment, currentTime, isActive, searchTerm, onClick }, ref) => (
    <button
      className={cn(
        "flex w-full gap-2.5 border-border/40 border-b px-3 py-2 text-left transition-colors last:border-b-0",
        isActive ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"
      )}
      onClick={onClick}
      ref={ref}
      type="button"
    >
      <span className="shrink-0 pt-0.5 font-mono text-[10px] text-foreground/40 tabular-nums">
        {formatTime(segment.start)}
      </span>
      <span className="text-[13px] text-foreground/80 leading-relaxed">
        {segment.words.map((word, i) => (
          <TranscriptWord
            currentTime={currentTime}
            isLineActive={isActive}
            key={i}
            searchTerm={searchTerm}
            word={word}
          />
        ))}
      </span>
    </button>
  )
);

TranscriptLine.displayName = "TranscriptLine";

function TranscriptWord({
  word,
  currentTime,
  isLineActive,
  searchTerm,
}: {
  word: TranscriptSegment;
  currentTime: number;
  isLineActive: boolean;
  searchTerm?: string;
}) {
  const isCurrentWord =
    isLineActive && currentTime >= word.start && currentTime < word.end;

  const isSearchMatch =
    searchTerm && word.value.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <span
      className={cn(
        "transition-colors duration-100",
        isCurrentWord && "bg-primary/25 text-foreground",
        isSearchMatch && !isCurrentWord && "bg-primary/15"
      )}
    >
      {word.value}{" "}
    </span>
  );
}

function TranscriptSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="border-border/40 border-b p-2">
        <Skeleton className="h-7 w-full" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          className="flex gap-2.5 border-border/40 border-b px-3 py-2 last:border-b-0"
          key={i}
        >
          <Skeleton className="h-3 w-7" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}
