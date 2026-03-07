"use client";

import { motion } from "motion/react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/cn";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M10 12L6 8L10 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

type CarouselToolbarProps = {
  current: number;
  total: number;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function CarouselToolbar({
  current,
  total,
  canScrollPrev,
  canScrollNext,
  onPrev,
  onNext,
}: CarouselToolbarProps) {
  useHotkeys("left", onPrev, { enabled: canScrollPrev }, [
    onPrev,
    canScrollPrev,
  ]);
  useHotkeys("right", onNext, { enabled: canScrollNext }, [
    onNext,
    canScrollNext,
  ]);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="-translate-x-1/2 fixed bottom-4 left-1/2 z-50 sm:bottom-8"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <div className="flex items-center gap-1 rounded-md border border-border bg-card/80 px-2 py-1.5 backdrop-blur-lg">
        <span className="px-2 font-mono text-muted-foreground text-sm">
          {current} / {total}
        </span>

        <div className="h-4 w-px bg-border" />

        <button
          className={cn(
            "rounded-sm p-1.5 text-muted-foreground transition-colors",
            canScrollPrev
              ? "hover:bg-foreground/5 hover:text-foreground"
              : "opacity-30"
          )}
          disabled={!canScrollPrev}
          onClick={onPrev}
          type="button"
        >
          <ChevronLeft />
        </button>

        <button
          className={cn(
            "rounded-sm p-1.5 text-muted-foreground transition-colors",
            canScrollNext
              ? "hover:bg-foreground/5 hover:text-foreground"
              : "opacity-30"
          )}
          disabled={!canScrollNext}
          onClick={onNext}
          type="button"
        >
          <ChevronRight />
        </button>

        <div className="h-4 w-px bg-border" />

        <a
          className="rounded-sm px-3 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-foreground/5 hover:text-foreground"
          href="https://cal.com/kuluruvineeth/30min"
          rel="noopener noreferrer"
          target="_blank"
        >
          Book a meeting
        </a>
      </div>
    </motion.div>
  );
}
