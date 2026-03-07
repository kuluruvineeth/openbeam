"use client";

import { TextShimmer } from "@openbeam/ui";
import { memo, useMemo } from "react";
import { Icons } from "@/components/icons";
import type { ThinkingStep } from "@/lib/thinking-types";
import { formatThinkingDuration } from "@/lib/thinking-types";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<string, typeof Icons.Search> = {
  search: Icons.Search,
  analyze: Icons.SparklesIcon,
  synthesize: Icons.SparklesIcon,
  document: Icons.FileTextIcon,
};

function getStepIcon(name: string): typeof Icons.Search {
  for (const [key, icon] of Object.entries(STEP_ICONS)) {
    if (name.toLowerCase().includes(key)) {
      return icon;
    }
  }
  return Icons.SparklesIcon;
}

type ThinkingStepItemProps = {
  step: ThinkingStep;
  className?: string;
};

function ThinkingStepItemInner({ step, className }: ThinkingStepItemProps) {
  const Icon = useMemo(() => getStepIcon(step.name), [step.name]);
  const isActive = step.status === "active";
  const isCompleted = step.status === "completed";

  const showDuration =
    isCompleted && step.durationMs !== undefined && step.durationMs > 100;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        isCompleted && "text-muted-foreground/60",
        !(isCompleted || isActive) && "text-muted-foreground/40",
        className
      )}
    >
      {isCompleted ? (
        <Icons.Check className="text-primary" size={12} />
      ) : (
        <Icon className={cn(isActive && "text-primary")} size={12} />
      )}
      {isActive ? (
        <TextShimmer as="span" className="text-xs" duration={1.5}>
          {step.displayName}...
        </TextShimmer>
      ) : (
        <span className="flex items-center gap-1.5">
          <span>{step.displayName}</span>
          {showDuration && step.durationMs !== undefined && (
            <span className="font-mono text-[10px] text-muted-foreground/50">
              {formatThinkingDuration(step.durationMs)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export const ThinkingStepItem = memo(ThinkingStepItemInner);
ThinkingStepItem.displayName = "ThinkingStepItem";
