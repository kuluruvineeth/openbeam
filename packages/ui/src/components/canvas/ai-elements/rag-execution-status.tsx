"use client";

import { memo, type ReactNode } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";

type RagExecutionStep =
  | "idle"
  | "analyzing"
  | "searching"
  | "reranking"
  | "synthesizing"
  | "complete"
  | "error";

interface ExecutionStep {
  id: RagExecutionStep;
  label: string;
  icon: ReactNode;
}

const EXECUTION_STEPS: ExecutionStep[] = [
  {
    id: "analyzing",
    label: "Analyzing query",
    icon: <Icons.Search size={14} />,
  },
  {
    id: "searching",
    label: "Searching sources",
    icon: <Icons.Database size={14} />,
  },
  {
    id: "reranking",
    label: "Reranking results",
    icon: <Icons.Layers size={14} />,
  },
  {
    id: "synthesizing",
    label: "Generating answer",
    icon: <Icons.Sparkles size={14} />,
  },
];

interface RagExecutionProgress {
  step: string;
  chunksRetrieved?: number;
  chunksReranked?: number;
}

interface RagExecutionStatusProps {
  status: RagExecutionStep;
  progress?: RagExecutionProgress;
}

function StepIcon({
  isActive,
  isComplete,
  icon,
}: {
  isActive: boolean;
  isComplete: boolean;
  icon: ReactNode;
}) {
  if (isActive) {
    return <Icons.Spinner className="size-3.5 animate-spin" />;
  }
  if (isComplete) {
    return <Icons.Check className="size-3.5" />;
  }
  return <span className="size-3.5">{icon}</span>;
}

export const RagExecutionStatus = memo(function RagExecutionStatusComponent({
  status,
  progress,
}: RagExecutionStatusProps) {
  if (status === "idle") {
    return null;
  }

  const currentStepIndex = EXECUTION_STEPS.findIndex((s) => s.id === status);

  return (
    <div className="space-y-1.5">
      {EXECUTION_STEPS.map((step, i) => {
        const isActive = step.id === status;
        const isComplete = i < currentStepIndex || status === "complete";

        return (
          <div
            className={cn(
              "flex items-center gap-2 text-xs",
              isActive && "text-primary",
              isComplete && "text-muted-foreground",
              !(isActive || isComplete) && "text-muted-foreground/50"
            )}
            key={step.id}
          >
            <StepIcon
              icon={step.icon}
              isActive={isActive}
              isComplete={isComplete}
            />
            <span>{step.label}</span>
            {isActive && progress?.chunksRetrieved !== undefined && (
              <span className="text-muted-foreground">
                ({progress.chunksRetrieved} chunks)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

RagExecutionStatus.displayName = "RagExecutionStatus";

export type { RagExecutionStep, RagExecutionProgress, RagExecutionStatusProps };
