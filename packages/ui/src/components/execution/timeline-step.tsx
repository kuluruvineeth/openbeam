"use client";

import type { TimelineStep as TimelineStepType } from "@openbeam/types/canvas/timeline";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import { Icons } from "../icons";
import { TextShimmer } from "../text-shimmer";
import { TimelineConnector } from "./timeline-connector";
import { TimelineStepIndicator } from "./timeline-step-indicator";

const timelineStepVariants = cva("group relative flex gap-2.5 text-sm", {
  variants: {
    interactive: {
      true: "-mx-2 cursor-pointer rounded-sm px-2 py-1.5 transition-colors hover:bg-[#F2F1EF]/30 dark:hover:bg-[#1A1A1A]/30",
      false: "",
    },
    selected: {
      true: "-mx-2 rounded-sm bg-[#F2F1EF]/40 px-2 py-1.5 dark:bg-[#1A1A1A]/40",
      false: "",
    },
  },
  defaultVariants: {
    interactive: false,
    selected: false,
  },
});

type TimelineStepProps = Omit<React.ComponentProps<"div">, "onClick"> &
  VariantProps<typeof timelineStepVariants> & {
    step: TimelineStepType;
    showConnector?: boolean;
    showDuration?: boolean;
    showRetryBadge?: boolean;
    isLast?: boolean;
    onClick?: (step: TimelineStepType) => void;
  };

const nodeTypeIcons: Record<string, React.FC<{ className?: string }>> = {
  llm: Icons.BotIcon,
  rag: Icons.Search,
  extract: Icons.FileText,
  classify: Icons.Tag,
  summarize: Icons.AlignLeft,
  code: Icons.Code,
  template: Icons.FileCode,
  filter: Icons.Filter,
  condition: Icons.GitBranch,
  loop: Icons.Repeat,
  "parallel-split": Icons.GitFork,
  "parallel-join": Icons.GitMerge,
  approval: Icons.UserCheck,
  input: Icons.FormInput,
  notify: Icons.Bell,
  "http-request": Icons.Globe,
  "database-query": Icons.Database,
  connector: Icons.Plug,
  "connector-action": Icons.Zap,
  start: Icons.Play,
  end: Icons.Square,
  default: Icons.Circle,
};

function getNodeIcon(nodeType: string): React.FC<{ className?: string }> {
  const normalizedType = nodeType.toLowerCase().replace(/_/g, "-");
  return nodeTypeIcons[normalizedType] ?? nodeTypeIcons.default ?? Icons.Circle;
}

const TimelineStep = forwardRef<HTMLDivElement, TimelineStepProps>(
  (
    {
      step,
      showConnector = true,
      showDuration = true,
      showRetryBadge = true,
      isLast = false,
      interactive,
      selected,
      onClick,
      className,
      ...props
    },
    ref
  ) => {
    const Icon = getNodeIcon(step.nodeType);
    const isRunning = step.status === "running";
    const hasRetries = step.retryCount > 0;

    const handleClick = () => {
      if (onClick) {
        onClick(step);
      }
    };

    const stepContent = (
      <>
        <div className="flex flex-col items-center">
          <TimelineStepIndicator status={step.status} />
          {showConnector && !isLast && (
            <TimelineConnector size="md" status={step.status} />
          )}
        </div>
        <div
          className={cn("flex-1 pb-1.5", !isLast && showConnector && "pb-2.5")}
        >
          <div className="flex items-center gap-1.5">
            <Icon className="size-3 text-muted-foreground" />
            {isRunning ? (
              <TextShimmer as="span" className="text-sm" duration={1.5}>
                {step.nodeName}
              </TextShimmer>
            ) : (
              <span className="text-sm">{step.nodeName}</span>
            )}
            {showRetryBadge && hasRetries && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Icons.RefreshCw className="size-2" />
                {step.retryCount}
              </span>
            )}
            {showDuration && step.durationMs != null && (
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                {formatDurationPrecise(step.durationMs)}
              </span>
            )}
          </div>
          {step.status === "error" && step.error && (
            <p className="mt-1 line-clamp-1 text-destructive text-xs">
              {step.error}
            </p>
          )}
        </div>
      </>
    );

    if (onClick || interactive) {
      return (
        <button
          className={cn(
            timelineStepVariants({ interactive: true, selected }),
            "w-full text-left",
            className
          )}
          onClick={handleClick}
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          {...(props as React.ComponentProps<"button">)}
        >
          {stepContent}
        </button>
      );
    }

    return (
      <div
        className={cn(
          timelineStepVariants({ interactive, selected }),
          className
        )}
        ref={ref}
        {...props}
      >
        {stepContent}
      </div>
    );
  }
);
TimelineStep.displayName = "TimelineStep";

export { TimelineStep, timelineStepVariants, getNodeIcon };
export type { TimelineStepProps };
