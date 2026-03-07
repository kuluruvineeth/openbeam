"use client";

import type { Citation } from "@openbeam/types/canvas";
import { cva } from "class-variance-authority";
import { forwardRef, memo, useState } from "react";
import { cn } from "../../../utils";
import { Badge } from "../../badge";
import { Button } from "../../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../collapsible";
import { Icons } from "../../icons";

const sourceItemStyles = cva(
  "group flex cursor-pointer items-start gap-2 rounded-md border bg-background/50 p-2 transition-colors hover:bg-muted/50",
  {
    variants: {
      relevance: {
        high: "border-green-500/30",
        medium: "border-amber-500/30",
        low: "border-border",
      },
    },
    defaultVariants: {
      relevance: "low",
    },
  }
);

function getRelevanceBarColor(score: number): string {
  if (score >= 0.8) {
    return "bg-green-500";
  }
  if (score >= 0.5) {
    return "bg-amber-500";
  }
  return "bg-muted-foreground";
}

function getRelevance(score?: number): "high" | "medium" | "low" {
  if (!score) {
    return "low";
  }
  if (score >= 0.8) {
    return "high";
  }
  if (score >= 0.5) {
    return "medium";
  }
  return "low";
}

export interface SourcesCollapsibleProps {
  citations: Citation[];
  defaultOpen?: boolean;
  onCitationClick?: (citation: Citation) => void;
  className?: string;
  compact?: boolean;
}

export const SourcesCollapsible = memo(
  forwardRef<HTMLDivElement, SourcesCollapsibleProps>(
    function SourcesCollapsibleComponent(
      { citations, defaultOpen = false, onCitationClick, className, compact },
      ref
    ) {
      const [open, setOpen] = useState(defaultOpen);

      if (citations.length === 0) {
        return null;
      }

      return (
        <Collapsible
          className={cn("w-full", className)}
          onOpenChange={setOpen}
          open={open}
          ref={ref}
        >
          <CollapsibleTrigger asChild>
            <Button
              className={cn(
                "flex w-full items-center justify-between font-normal",
                compact ? "h-7 px-2" : "h-8 px-3"
              )}
              variant="ghost"
            >
              <div className="flex items-center gap-2">
                <Icons.FileText className="text-muted-foreground" size={14} />
                <span className="text-sm">Sources</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="h-5 text-[10px]" variant="secondary">
                  {citations.length}
                </Badge>
                <Icons.ChevronDown
                  className={cn(
                    "text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                  size={16}
                />
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 px-1 pt-1.5">
            {citations.map((citation, index) => (
              <button
                className={cn(
                  sourceItemStyles({
                    relevance: getRelevance(citation.relevanceScore),
                  }),
                  "w-full text-left"
                )}
                key={`${citation.documentId}-${citation.chunkId ?? index.toString()}`}
                onClick={() => onCitationClick?.(citation)}
                type="button"
              >
                <div className="flex size-5 shrink-0 items-center justify-center rounded bg-muted font-medium text-[10px]">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-xs">
                      {citation.title}
                    </span>
                    {citation.url && (
                      <Icons.ExternalLink
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        size={12}
                      />
                    )}
                  </div>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {citation.snippet}
                  </p>
                  {citation.relevanceScore !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            getRelevanceBarColor(citation.relevanceScore)
                          )}
                          style={{
                            width: `${citation.relevanceScore * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {(citation.relevanceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }
  )
);

SourcesCollapsible.displayName = "SourcesCollapsible";
