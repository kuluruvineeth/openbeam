"use client";

import type { Citation } from "@openplane/types/canvas";
import { memo } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";

interface CitationCardProps {
  index: number;
  citation: Citation;
  onClick?: () => void;
  className?: string;
}

export const CitationCard = memo(function CitationCardComponent({
  index,
  citation,
  onClick,
  className,
}: CitationCardProps) {
  return (
    <button
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-md border border-border/50 p-3 text-left transition-colors",
        "hover:border-border hover:bg-muted/50",
        className
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-sm bg-primary/10 font-mono text-primary text-xs">
          {index}
        </span>
        <span className="flex-1 truncate font-medium text-sm">
          {citation.title}
        </span>
        {citation.relevanceScore !== undefined && (
          <span className="text-muted-foreground text-xs">
            {(citation.relevanceScore * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-muted-foreground text-xs">
        {citation.snippet}
      </p>
      {citation.url && (
        <div className="flex items-center gap-1 text-primary text-xs">
          <Icons.ExternalLink size={12} />
          <span className="truncate">{citation.url}</span>
        </div>
      )}
    </button>
  );
});

CitationCard.displayName = "CitationCard";

export type { CitationCardProps };
