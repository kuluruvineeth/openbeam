"use client";

import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  TextShimmer,
} from "@openbeam/ui";
import { m } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import type { ThinkingState, ThinkingStep } from "@/lib/thinking-types";
import { cn } from "@/lib/utils";
import { ThinkingContent } from "./thinking-content";
import { ThinkingStepItem } from "./thinking-step-item";
import { ThinkingSummary } from "./thinking-summary";

type ThinkingDisplayProps = {
  thinking: ThinkingState;
  steps?: ThinkingStep[];
  statusMessage?: string | null;
  thinkingMessage?: string | null;
  className?: string;
  autoExpand?: boolean;
  autoCollapseDelay?: number;
};

const EMPTY_STEPS: ThinkingStep[] = [];

function ThinkingDisplayInner({
  thinking,
  steps = EMPTY_STEPS,
  statusMessage,
  thinkingMessage,
  className,
  autoExpand = true,
  autoCollapseDelay = 1000,
}: ThinkingDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wasAutoExpandedRef = useRef(false);
  const manuallyToggledRef = useRef(false);

  const hasThinkingContent = thinking.content.length > 0;
  const isThinkingActive = thinking.isActive;
  const hasVisibleSteps = steps.length > 0;
  const activeStep = steps.find((s) => s.status === "active");

  useEffect(() => {
    if (
      autoExpand &&
      isThinkingActive &&
      hasThinkingContent &&
      !wasAutoExpandedRef.current &&
      !manuallyToggledRef.current
    ) {
      setIsOpen(true);
      wasAutoExpandedRef.current = true;
    }
  }, [autoExpand, isThinkingActive, hasThinkingContent]);

  useEffect(() => {
    if (
      !isThinkingActive &&
      wasAutoExpandedRef.current &&
      !manuallyToggledRef.current &&
      isOpen
    ) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        wasAutoExpandedRef.current = false;
      }, autoCollapseDelay);
      return () => clearTimeout(timer);
    }
  }, [isThinkingActive, isOpen, autoCollapseDelay]);

  function handleOpenChange(open: boolean) {
    manuallyToggledRef.current = true;
    setIsOpen(open);
  }

  function getActiveLabel(): string {
    if (statusMessage) {
      return statusMessage;
    }
    if (thinkingMessage) {
      return "Reasoning";
    }
    if (activeStep) {
      return activeStep.displayName;
    }
    return "Processing";
  }

  if (!(hasVisibleSteps || hasThinkingContent)) {
    const displayMessage = statusMessage ?? thinkingMessage ?? "Thinking";
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <m.div
          animate={{ rotate: 360 }}
          className="flex items-center justify-center"
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          <Icons.Spinner className="text-primary" size={14} />
        </m.div>
        <TextShimmer as="span" className="font-medium text-sm">
          {displayMessage}...
        </TextShimmer>
      </div>
    );
  }

  const showThinkingSummary =
    !isThinkingActive && thinking.durationMs && thinking.durationMs > 500;

  function renderTriggerLabel() {
    if (isThinkingActive) {
      return (
        <TextShimmer as="span" className="font-medium text-sm">
          {getActiveLabel()}...
        </TextShimmer>
      );
    }
    if (showThinkingSummary) {
      return (
        <ThinkingSummary
          durationMs={thinking.durationMs}
          hasContent={hasThinkingContent}
        />
      );
    }
    return (
      <span className="font-medium text-muted-foreground text-sm">
        View reasoning
      </span>
    );
  }

  return (
    <Collapsible
      className={cn("flex flex-col", className)}
      onOpenChange={handleOpenChange}
      open={isOpen}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="flex h-auto w-full items-center justify-start gap-2 px-0 py-1 text-muted-foreground hover:text-foreground"
          variant="ghost"
        >
          {isThinkingActive ? (
            <m.div
              animate={{ rotate: 360 }}
              className="flex items-center justify-center"
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <Icons.Spinner className="text-primary" size={14} />
            </m.div>
          ) : (
            <Icons.SparklesIcon className="text-primary/70" size={14} />
          )}

          {renderTriggerLabel()}

          <Icons.ChevronDown
            className={cn(
              "ml-auto transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            size={14}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="flex flex-col gap-3 pt-2">
          {hasThinkingContent && (
            <ThinkingContent
              content={thinking.content}
              isActive={isThinkingActive}
            />
          )}

          {hasVisibleSteps && (
            <div className="ml-[7px] border-border/50 border-l pl-4">
              <div className="flex flex-col gap-1.5 py-1">
                {steps.map((step) => (
                  <ThinkingStepItem key={step.id} step={step} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const ThinkingDisplay = memo(ThinkingDisplayInner);
ThinkingDisplay.displayName = "ThinkingDisplay";
