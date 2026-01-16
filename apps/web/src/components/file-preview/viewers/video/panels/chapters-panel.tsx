"use client";

import { Skeleton } from "@openplane/ui";
import { Icons } from "@/components/icons";
import { formatTime } from "@/lib/format";
import type { MediaChapter } from "@/lib/media-types";
import { cn } from "@/lib/utils";

type ChaptersPanelProps = {
  chapters?: MediaChapter[];
  currentTime: number;
  isLoading: boolean;
  onSeek: (time: number) => void;
};

export function ChaptersPanel({
  chapters,
  currentTime,
  isLoading,
  onSeek,
}: ChaptersPanelProps) {
  if (isLoading) {
    return <ChaptersSkeleton />;
  }

  if (!chapters?.length) {
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
            No chapters available
          </p>
          <p className="mt-1 text-[11px] text-foreground/35">
            Chapters will appear after processing
          </p>
        </div>
      </div>
    );
  }

  const activeIndex = chapters.findIndex(
    (ch) => currentTime >= ch.startSec && currentTime < ch.endSec
  );

  return (
    <div className="flex flex-col">
      {chapters.map((chapter, idx) => (
        <ChapterItem
          chapter={chapter}
          displayIndex={idx}
          isActive={idx === activeIndex}
          key={chapter.chapterNumber}
          onClick={() => onSeek(chapter.startSec)}
        />
      ))}
    </div>
  );
}

function ChapterItem({
  chapter,
  isActive,
  displayIndex,
  onClick,
}: {
  chapter: MediaChapter;
  isActive: boolean;
  displayIndex: number;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full border-border/40 border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
        isActive
          ? "bg-foreground/4 text-foreground"
          : "text-foreground/80 hover:bg-foreground/2"
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center font-mono text-[10px] tabular-nums",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-foreground/[0.06] text-foreground/50"
          )}
        >
          {typeof chapter.chapterNumber === "number" &&
          chapter.chapterNumber > 0 &&
          !Number.isNaN(chapter.chapterNumber)
            ? chapter.chapterNumber
            : displayIndex + 1}
        </span>
        <p className="min-w-0 flex-1 truncate font-medium text-[13px] leading-tight">
          {chapter.title}
        </p>
        <span className="shrink-0 bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-foreground/50 tabular-nums">
          {formatTime(chapter.startSec)}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 pr-2 pl-[30px] text-[11px] text-foreground/50 leading-relaxed">
        {chapter.summary}
      </p>
    </button>
  );
}

function ChaptersSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          className="flex items-start gap-2.5 border-border/40 border-b px-3 py-2.5 last:border-b-0"
          key={i}
        >
          <Skeleton className="size-5" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}
