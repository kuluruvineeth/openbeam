"use client";

import type { Citation } from "@openplane/types/canvas";
import { memo } from "react";
import { cn } from "../../../utils";

interface CitationChipProps {
  index: number;
  citation: Citation;
  onClick?: () => void;
  expanded?: boolean;
}

export const CitationChip = memo(function CitationChipComponent({
  index,
  citation,
  onClick,
  expanded,
}: CitationChipProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs transition-colors",
        "bg-primary/10 text-primary hover:bg-primary/20",
        expanded && "ring-1 ring-primary"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="font-mono">[{index}]</span>
      <span className="max-w-[120px] truncate">{citation.title}</span>
      {citation.relevanceScore !== undefined && (
        <span className="text-muted-foreground">
          {(citation.relevanceScore * 100).toFixed(0)}%
        </span>
      )}
    </button>
  );
});

CitationChip.displayName = "CitationChip";

export type { CitationChipProps };
