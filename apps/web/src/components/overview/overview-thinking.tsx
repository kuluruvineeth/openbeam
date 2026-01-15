"use client";

import { memo, useMemo } from "react";
import { ThinkingDisplay } from "@/components/thinking";
import type { OverviewStep, ThinkingState } from "@/lib/overview-types";
import type { ThinkingStep } from "@/lib/thinking-types";

type OverviewThinkingProps = {
  steps: OverviewStep[];
  thinking: ThinkingState;
  thinkingMessage?: string | null;
  statusMessage?: string | null;
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
  className,
}: OverviewThinkingProps) {
  const thinkingSteps = useMemo(
    () => steps.filter((s) => !s.ephemeral).map(toThinkingStep),
    [steps]
  );

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
