"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useState } from "react";
import { AGENT_UI_CONSTANTS } from "../../lib/agent-constants";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import { Icons } from "../icons";
import type { CitationSource } from "./agent-citation";

const agentCitationsVariants = cva("rounded-md border", {
  variants: {
    variant: {
      default: "border-border bg-muted/30",
      outline: "border-border/50 bg-transparent",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type AgentCitationsProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentCitationsVariants> & {
    citations: CitationSource[];
    title?: string;
    defaultExpanded?: boolean;
    maxVisible?: number;
    onCitationClick?: (citation: CitationSource) => void;
  };

const AgentCitations = forwardRef<HTMLDivElement, AgentCitationsProps>(
  (
    {
      className,
      variant,
      citations,
      title = "Sources",
      defaultExpanded = false,
      maxVisible = AGENT_UI_CONSTANTS.MAX_VISIBLE_TOOLS,
      onCitationClick,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const [showAll, setShowAll] = useState(false);

    if (citations.length === 0) {
      return null;
    }

    const visibleCitations = showAll
      ? citations
      : citations.slice(0, maxVisible);
    const hiddenCount = citations.length - maxVisible;

    const renderCitation = (citation: CitationSource, index: number) => {
      const citationContent = (
        <>
          <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-medium text-primary text-xs">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Icons.FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <p className="truncate font-medium text-sm">{citation.title}</p>
            </div>
            {citation.source && (
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                {citation.source}
              </p>
            )}
            {citation.snippet && (
              <p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                {citation.snippet}
              </p>
            )}
          </div>
          {citation.url && (
            <a
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              href={citation.url}
              onClick={(e) => e.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icons.ExternalLink className="size-3.5" />
            </a>
          )}
        </>
      );

      if (onCitationClick) {
        return (
          <button
            className="flex w-full items-start gap-3 border-border/30 border-t px-3 py-2 text-left transition-colors hover:bg-muted/50"
            key={citation.id}
            onClick={() => onCitationClick(citation)}
            type="button"
          >
            {citationContent}
          </button>
        );
      }

      return (
        <div
          className="flex items-start gap-3 border-border/30 border-t px-3 py-2"
          key={citation.id}
        >
          {citationContent}
        </div>
      );
    };

    if (citations.length <= 2) {
      return (
        <div
          className={cn(agentCitationsVariants({ variant }), className)}
          ref={ref}
          {...props}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <Icons.FileText className="size-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground text-sm">{title}</span>
            <span className="ml-auto text-muted-foreground text-xs tabular-nums">
              {citations.length}
            </span>
          </div>
          {citations.map((citation, index) => renderCitation(citation, index))}
        </div>
      );
    }

    return (
      <Collapsible asChild onOpenChange={setIsOpen} open={isOpen}>
        <div
          className={cn(agentCitationsVariants({ variant }), className)}
          ref={ref}
          {...props}
        >
          <CollapsibleTrigger asChild>
            <Button
              className="h-auto w-full justify-start p-0 hover:bg-transparent"
              variant="ghost"
            >
              <div className="flex w-full items-center gap-2 px-3 py-2">
                <Icons.FileText className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground text-sm">
                  {title}
                </span>
                <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                  {citations.length}
                </span>
                <Icons.ChevronDown
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {visibleCitations.map((citation, index) =>
              renderCitation(citation, index)
            )}
            {hiddenCount > 0 && !showAll && (
              <Button
                className="h-auto w-full justify-center gap-1 border-border/30 border-t py-2 text-muted-foreground text-xs hover:text-foreground"
                onClick={() => setShowAll(true)}
                variant="ghost"
              >
                Show {hiddenCount} more
              </Button>
            )}
          </CollapsibleContent>
          {!isOpen && (
            <div className="flex items-center gap-1.5 border-border/30 border-t px-3 py-1.5">
              <span className="text-muted-foreground text-xs">
                {citations.length} sources cited
              </span>
            </div>
          )}
        </div>
      </Collapsible>
    );
  }
);
AgentCitations.displayName = "AgentCitations";

export { AgentCitations, agentCitationsVariants };
export type { AgentCitationsProps };
