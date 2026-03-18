"use client";

import { cn } from "@openbeam/ui";

type AudioVisualizerProps = {
  bands: number[];
  isActive: boolean;
  className?: string;
};

const BAR_COUNT = 5;
const MIN_HEIGHT = 3;
const MAX_HEIGHT = 24;

export function AudioVisualizer({
  bands,
  isActive,
  className,
}: AudioVisualizerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center justify-center gap-[3px]", className)}
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const amplitude = isActive ? (bands[i] ?? 0) : 0;
        const height = MIN_HEIGHT + amplitude * (MAX_HEIGHT - MIN_HEIGHT);

        return (
          <div
            className={cn(
              "w-[3px] rounded-full transition-all duration-75",
              isActive ? "bg-primary" : "bg-muted-foreground/30"
            )}
            key={i}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}
