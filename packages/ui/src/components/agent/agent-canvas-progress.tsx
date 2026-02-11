"use client";

import { forwardRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible";
import { Icons } from "../icons";
import { TextShimmer } from "../text-shimmer";

interface CanvasStatusEvent {
  type: "status";
  timestamp: number;
  status: string;
  message: string;
}

type AgentCanvasProgressProps = React.ComponentProps<"div"> & {
  events: CanvasStatusEvent[];
  isStreaming?: boolean;
};

const AgentCanvasProgress = forwardRef<
  HTMLDivElement,
  AgentCanvasProgressProps
>(({ className, events, isStreaming = false, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const stepCount = events.length;

  if (isStreaming) {
    const currentStep = events.at(-1)?.message ?? "Building workflow";
    return (
      <div
        className={cn("inline-flex items-center gap-1.5", className)}
        ref={ref}
        {...props}
      >
        <TextShimmer
          as="span"
          className="font-medium text-xs"
          duration={1.5}
          spread={1.5}
        >
          {currentStep}...
        </TextShimmer>
      </div>
    );
  }

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <div className={cn(className)} ref={ref} {...props}>
        <CollapsibleTrigger asChild>
          <Button
            className="h-auto gap-1.5 px-0 py-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            variant="ghost"
          >
            <Icons.Check className="size-3 shrink-0" />
            <span className="font-medium text-xs">
              Built workflow ({stepCount} {stepCount === 1 ? "step" : "steps"})
            </span>
            <Icons.ChevronDown
              className={cn(
                "size-3 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="mt-1 space-y-0.5 pl-5">
            {events.map((event, index) => (
              <span
                className="flex items-center gap-1.5 text-muted-foreground text-xs"
                key={`${event.timestamp}-${index}`}
              >
                <Icons.Check className="size-2.5 shrink-0" />
                {event.message}
              </span>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
AgentCanvasProgress.displayName = "AgentCanvasProgress";

export { AgentCanvasProgress };
export type { AgentCanvasProgressProps };
