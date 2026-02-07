"use client";

import { forwardRef } from "react";
import { useAutoCollapse } from "../../hooks/use-auto-collapse";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import { Icons } from "../icons";
import { TextShimmer } from "../text-shimmer";
import { AgentThinkingSummary } from "./agent-thinking-summary";
import { StreamingText } from "./streaming-text";

type AgentThinkingProps = React.ComponentProps<"div"> & {
  content: string;
  isActive?: boolean;
  durationMs?: number | null;
  label?: string;
  autoExpand?: boolean;
  autoCollapseDelay?: number;
};

const AgentThinking = forwardRef<HTMLDivElement, AgentThinkingProps>(
  (
    {
      className,
      content,
      isActive = false,
      durationMs,
      label = "Reasoning",
      autoExpand = true,
      autoCollapseDelay,
      ...props
    },
    ref
  ) => {
    const hasContent = content.length > 0;
    const showSummary = !isActive && durationMs != null && durationMs > 500;

    const { isOpen, setIsOpen } = useAutoCollapse({
      isActive: isActive && hasContent,
      autoExpand,
      collapseDelay: autoCollapseDelay,
    });

    if (!(hasContent || isActive)) {
      return null;
    }

    if (!hasContent && isActive) {
      return (
        <div
          className={cn("flex items-center gap-2", className)}
          ref={ref}
          {...props}
        >
          <Icons.Loader2 className="size-3.5 animate-spin text-primary" />
          <TextShimmer as="span" className="text-sm" duration={1.5}>
            {label}...
          </TextShimmer>
        </div>
      );
    }

    const renderTriggerLabel = () => {
      if (isActive) {
        return (
          <TextShimmer as="span" className="font-medium text-sm" duration={1.5}>
            {label}...
          </TextShimmer>
        );
      }
      if (showSummary) {
        return (
          <AgentThinkingSummary
            durationMs={durationMs}
            hasContent={hasContent}
          />
        );
      }
      return (
        <span className="font-medium text-muted-foreground text-sm">
          View reasoning
        </span>
      );
    };

    return (
      <Collapsible asChild onOpenChange={setIsOpen} open={isOpen}>
        <div className={cn("flex flex-col", className)} ref={ref} {...props}>
          <CollapsibleTrigger asChild>
            <Button
              className="flex h-auto w-full items-center justify-start gap-2 px-0 py-1 text-muted-foreground hover:text-foreground"
              variant="ghost"
            >
              {isActive ? (
                <Icons.Loader2 className="size-3.5 animate-spin text-primary" />
              ) : (
                <Icons.Sparkles className="size-3.5 text-primary/70" />
              )}
              {renderTriggerLabel()}
              <Icons.ChevronDown
                className={cn(
                  "ml-auto size-3.5 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <div className="rounded-md border border-border/50 bg-muted/30 p-3">
              <StreamingText
                className="whitespace-pre-wrap font-mono text-muted-foreground text-xs leading-relaxed"
                isStreaming={isActive}
              >
                {content}
              </StreamingText>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }
);
AgentThinking.displayName = "AgentThinking";

export { AgentThinking };
export type { AgentThinkingProps };
