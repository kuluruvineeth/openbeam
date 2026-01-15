"use client";

import { memo } from "react";
import { Icons } from "@/components/icons";
import { formatThinkingDuration } from "@/lib/thinking-types";

type ThinkingSummaryProps = {
  durationMs: number | null;
  hasContent: boolean;
  className?: string;
};

function ThinkingSummaryInner({
  durationMs,
  hasContent,
  className,
}: ThinkingSummaryProps) {
  if (!(durationMs || hasContent)) {
    return null;
  }

  const parts: string[] = [];
  if (durationMs) {
    parts.push(`Thought for ${formatThinkingDuration(durationMs)}`);
  }

  return (
    <span
      className={`flex items-center gap-1.5 text-muted-foreground/70 text-xs ${className ?? ""}`}
    >
      <Icons.SparklesIcon className="text-primary/50" size={12} />
      <span>{parts.join(" · ")}</span>
    </span>
  );
}

export const ThinkingSummary = memo(ThinkingSummaryInner);
ThinkingSummary.displayName = "ThinkingSummary";
