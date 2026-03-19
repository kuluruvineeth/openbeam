"use client";

import { memo, useMemo } from "react";
import { Icons } from "@/components/icons";
import { ThinkingDisplay } from "@/components/thinking";
import type { ThinkingStep } from "@/lib/thinking-types";
import { cn } from "@/lib/utils";
import type { OverviewStep, ThinkingState } from "../lib/overview-types";

type OverviewThinkingProps = {
  steps: OverviewStep[];
  thinking: ThinkingState;
  thinkingMessage?: string | null;
  statusMessage?: string | null;
  showSummaryOnly?: boolean;
  className?: string;
};

function toThinkingStep(step: OverviewStep): ThinkingStep {
  let displayName = step.displayName;
  if (step.sourceCount !== undefined && step.sourceCount > 0) {
    const plural = step.sourceCount > 1 ? "s" : "";
    displayName = `${displayName} (${step.sourceCount} source${plural})`;
  }

  return {
    id: step.id,
    name: step.toolName,
    displayName,
    status: step.status,
    durationMs: step.durationMs,
  };
}

function OverviewThinkingInner({
  steps,
  thinking,
  thinkingMessage,
  statusMessage,
  showSummaryOnly,
  className,
}: OverviewThinkingProps) {
  const thinkingSteps = useMemo(
    () => steps.filter((s) => !s.ephemeral).map(toThinkingStep),
    [steps]
  );

  const totalSources = steps.reduce((acc, s) => acc + (s.sourceCount ?? 0), 0);
  const durationSeconds = thinking.durationMs
    ? (thinking.durationMs / 1000).toFixed(1)
    : null;

  if (showSummaryOnly) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-muted-foreground/70 text-xs",
          className
        )}
      >
        <Icons.Check className="text-primary/60" size={12} />
        <span>
          Searched {totalSources} source{totalSources !== 1 ? "s" : ""}
          {durationSeconds ? ` in ${durationSeconds}s` : ""}
        </span>
      </div>
    );
  }

  return (
    <ThinkingDisplay
      className={className}
      statusMessage={statusMessage}
      steps={thinkingSteps}
      thinking={thinking}
      thinkingMessage={thinkingMessage}
    />
  );
}

export const OverviewThinking = memo(OverviewThinkingInner);
OverviewThinking.displayName = "OverviewThinking";
