"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/ui/text-shimmer";
import type { OverviewStep } from "@/lib/overview-types";
import { cn } from "@/lib/utils";

type OverviewThinkingProps = {
  steps: OverviewStep[];
  className?: string;
};

const TOOL_ICONS: Record<string, typeof Icons.Search> = {
  overview_search: Icons.Search,
  search_documents: Icons.Search,
  search_hybrid: Icons.Search,
  search_semantic: Icons.Search,
  build_context: Icons.FileTextIcon,
  analyze_query: Icons.SparklesIcon,
  rag_answer: Icons.SparklesIcon,
};

function getToolIcon(toolName: string): typeof Icons.Search {
  return TOOL_ICONS[toolName] ?? Icons.SparklesIcon;
}

const variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    marginTop: 0,
  },
  expanded: {
    height: "auto",
    opacity: 1,
    marginTop: 8,
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function StepItem({ step }: { step: OverviewStep }) {
  const Icon = getToolIcon(step.toolName);
  const isActive = step.status === "active";
  const isCompleted = step.status === "completed";

  let label = step.displayName;
  if (step.sourceCount !== undefined && step.sourceCount > 0) {
    const plural = step.sourceCount > 1 ? "s" : "";
    label = `${label} (${step.sourceCount} source${plural})`;
  }

  const showDuration =
    isCompleted && step.durationMs !== undefined && step.durationMs > 100;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        isCompleted && "text-muted-foreground/60",
        !(isCompleted || isActive) && "text-muted-foreground/40"
      )}
    >
      {isCompleted ? (
        <Icons.Check className="text-primary" size={12} />
      ) : (
        <Icon className={cn(isActive && "text-primary")} size={12} />
      )}
      {isActive ? (
        <TextShimmer as="span" className="text-xs" duration={1.5}>
          {label}...
        </TextShimmer>
      ) : (
        <span className="flex items-center gap-1.5">
          <span>{label}</span>
          {showDuration && step.durationMs !== undefined && (
            <span className="font-mono text-[10px] text-muted-foreground/50">
              {formatDuration(step.durationMs)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function getActiveDisplayName(activeStep: OverviewStep | undefined): string {
  if (!activeStep) {
    return "Processing";
  }
  return activeStep.displayName;
}

function OverviewThinkingInner({ steps, className }: OverviewThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeStep = steps.find((s) => s.status === "active");
  const activeLabel = getActiveDisplayName(activeStep);
  const hasSteps = steps.length > 0;

  if (!hasSteps) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <motion.div
          animate={{ rotate: 360 }}
          className="flex items-center justify-center"
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          <Icons.Spinner className="text-primary" size={14} />
        </motion.div>
        <TextShimmer as="span" className="font-medium text-sm">
          Thinking...
        </TextShimmer>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <Button
        className="flex h-auto items-center justify-start gap-2 px-0 py-1 text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
      >
        <motion.div
          animate={{ rotate: 360 }}
          className="flex items-center justify-center"
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        >
          <Icons.Spinner className="text-primary" size={14} />
        </motion.div>
        <TextShimmer as="span" className="font-medium text-sm">
          {activeLabel}...
        </TextShimmer>
        <Icons.ChevronDown
          className={cn("transition-transform", isExpanded && "rotate-180")}
          size={14}
        />
      </Button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            animate="expanded"
            className="ml-[7px] border-border/50 border-l pl-4 text-muted-foreground"
            exit="collapsed"
            initial="collapsed"
            transition={{ duration: 0.15, ease: "easeInOut" }}
            variants={variants}
          >
            <div className="flex flex-col gap-1.5 py-2">
              {steps.map((step) => (
                <StepItem key={step.id} step={step} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const OverviewThinking = memo(OverviewThinkingInner);
OverviewThinking.displayName = "OverviewThinking";
