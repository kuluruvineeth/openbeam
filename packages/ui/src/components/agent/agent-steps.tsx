"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import {
  type AgentEvent,
  type ToolStep,
  useToolSteps,
} from "../../hooks/use-tool-steps";
import { getToolCategory, getToolIcon } from "../../lib/tool-registry";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import { Icons } from "../icons";
import { TextShimmer } from "../text-shimmer";
import { AgentToolIcon } from "./agent-tool-icon";

const agentStepsVariants = cva("space-y-0", {
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const stepIndicatorVariants = cva(
  "flex size-6 items-center justify-center rounded-full border-2",
  {
    variants: {
      status: {
        pending: "border-muted-foreground/30 bg-background",
        running: "border-primary bg-primary/10",
        success: "border-green-500 bg-green-500/10",
        error: "border-destructive bg-destructive/10",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

type AgentStepsProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentStepsVariants> & {
    events: AgentEvent[];
    showDuration?: boolean;
    showConnector?: boolean;
    onStepClick?: (step: ToolStep) => void;
  };

const StepIndicator = forwardRef<
  HTMLDivElement,
  { status: ToolStep["status"]; className?: string }
>(({ status, className }, ref) => {
  const renderIcon = () => {
    switch (status) {
      case "pending":
        return (
          <Icons.Circle className="size-2 fill-muted-foreground/50 text-muted-foreground/50" />
        );
      case "running":
        return <Icons.Loader2 className="size-3 animate-spin text-primary" />;
      case "success":
        return <Icons.Check className="size-3 text-green-500" />;
      case "error":
        return <Icons.X className="size-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn(stepIndicatorVariants({ status }), className)} ref={ref}>
      {renderIcon()}
    </div>
  );
});
StepIndicator.displayName = "StepIndicator";

const AgentSteps = forwardRef<HTMLDivElement, AgentStepsProps>(
  (
    {
      className,
      size,
      events,
      showDuration = true,
      showConnector = true,
      onStepClick,
      ...props
    },
    ref
  ) => {
    const { steps, successCount, errorCount, totalDurationMs, isComplete } =
      useToolSteps(events);

    if (steps.length === 0) {
      return null;
    }

    const renderStep = (step: ToolStep, index: number) => {
      const isLast = index === steps.length - 1;
      const category = getToolCategory(step.toolName);
      const Icon = getToolIcon(step.toolName);

      const stepContent = (
        <>
          <div className="flex flex-col items-center">
            <StepIndicator status={step.status} />
            {showConnector && !isLast && (
              <div
                className={cn(
                  "min-h-8 w-0.5 flex-1",
                  step.status === "success" && "bg-green-500/30",
                  step.status === "error" && "bg-destructive/30",
                  step.status === "running" && "bg-primary/30",
                  step.status === "pending" && "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
          <div
            className={cn("flex-1 pb-4", !isLast && showConnector && "pb-6")}
          >
            <div className="flex items-center gap-2">
              <AgentToolIcon category={category} size="sm">
                <Icon className="size-3" />
              </AgentToolIcon>
              {step.status === "running" ? (
                <TextShimmer as="span" className="font-medium" duration={1.5}>
                  {step.displayName}
                </TextShimmer>
              ) : (
                <span className="font-medium text-foreground">
                  {step.displayName}
                </span>
              )}
              {showDuration && step.durationMs != null && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatDurationPrecise(step.durationMs)}
                </span>
              )}
            </div>
            {step.status === "error" && step.output != null && (
              <p className="mt-1 text-destructive text-xs">
                {typeof step.output === "object" &&
                step.output !== null &&
                "message" in step.output
                  ? String(step.output.message)
                  : String(step.output)}
              </p>
            )}
          </div>
        </>
      );

      if (onStepClick) {
        return (
          <button
            className="group relative flex w-full gap-3 text-left"
            key={step.id}
            onClick={() => onStepClick(step)}
            type="button"
          >
            {stepContent}
          </button>
        );
      }

      return (
        <div className="group relative flex gap-3" key={step.id}>
          {stepContent}
        </div>
      );
    };

    return (
      <div
        className={cn(agentStepsVariants({ size }), className)}
        ref={ref}
        {...props}
      >
        {steps.map((step, index) => renderStep(step, index))}
        {isComplete && (
          <div className="flex items-center gap-2 pt-2 text-muted-foreground text-xs">
            <span className="text-green-500">{successCount} completed</span>
            {errorCount > 0 && (
              <span className="text-destructive">{errorCount} failed</span>
            )}
            {showDuration && totalDurationMs > 0 && (
              <span className="ml-auto tabular-nums">
                Total: {formatDurationPrecise(totalDurationMs)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
AgentSteps.displayName = "AgentSteps";

export { AgentSteps, agentStepsVariants, stepIndicatorVariants };
export type { AgentStepsProps };
