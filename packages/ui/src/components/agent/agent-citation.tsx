"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { ExternalLink, FileText } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";

const agentCitationVariants = cva(
  "inline-flex items-center justify-center rounded font-medium text-xs tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default:
          "cursor-pointer bg-primary/10 text-primary hover:bg-primary/20",
        muted:
          "cursor-pointer bg-muted text-muted-foreground hover:bg-muted/80",
        outline:
          "cursor-pointer border border-border bg-transparent text-foreground hover:bg-muted",
      },
      size: {
        sm: "h-4 min-w-4 px-1 text-[10px]",
        md: "h-5 min-w-5 px-1.5 text-xs",
        lg: "h-6 min-w-6 px-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

interface CitationSource {
  id: string;
  title: string;
  snippet?: string;
  url?: string;
  source?: string;
  relevance?: number;
}

type AgentCitationProps = React.ComponentProps<"span"> &
  VariantProps<typeof agentCitationVariants> & {
    index: number;
    source?: CitationSource;
    showPreview?: boolean;
    onCitationClick?: (source: CitationSource) => void;
  };

const AgentCitation = forwardRef<HTMLSpanElement, AgentCitationProps>(
  (
    {
      className,
      variant,
      size,
      index,
      source,
      showPreview = true,
      onCitationClick,
      ...props
    },
    ref
  ) => {
    const isInteractive = Boolean(onCitationClick && source);

    const handleClick = () => {
      if (source && onCitationClick) {
        onCitationClick(source);
      }
    };

    const badge = isInteractive ? (
      <button
        className={cn(agentCitationVariants({ variant, size }), className)}
        onClick={handleClick}
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
      >
        {index}
      </button>
    ) : (
      <span
        className={cn(agentCitationVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {index}
      </span>
    );

    if (!(showPreview && source)) {
      return badge;
    }

    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>{badge}</HoverCardTrigger>
        <HoverCardContent align="start" className="w-80" side="top">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">{source.title}</p>
                {source.source && (
                  <p className="truncate text-muted-foreground text-xs">
                    {source.source}
                  </p>
                )}
              </div>
            </div>
            {source.snippet && (
              <p className="line-clamp-3 text-muted-foreground text-xs leading-relaxed">
                {source.snippet}
              </p>
            )}
            {source.url && (
              <a
                className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                href={source.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open source
                <ExternalLink className="size-3" />
              </a>
            )}
            {source.relevance !== undefined && (
              <div className="flex items-center gap-1">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${source.relevance * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {Math.round(source.relevance * 100)}%
                </span>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }
);
AgentCitation.displayName = "AgentCitation";

export { AgentCitation, agentCitationVariants };
export type { AgentCitationProps, CitationSource };
