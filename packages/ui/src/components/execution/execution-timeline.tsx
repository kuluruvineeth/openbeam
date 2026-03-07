"use client";

import type {
  TimelineData,
  TimelineFilter,
  TimelineSort,
  TimelineStep as TimelineStepType,
} from "@openbeam/types/canvas/timeline";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useMemo } from "react";
import { cn } from "../../utils/cn";
import { TimelineEmptyState } from "./timeline-empty-state";
import { TimelineStep } from "./timeline-step";

const executionTimelineVariants = cva("space-y-0", {
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

type ExecutionTimelineProps = React.ComponentProps<"div"> &
  VariantProps<typeof executionTimelineVariants> & {
    data: TimelineData;
    filter?: TimelineFilter;
    sort?: TimelineSort;
    selectedStepId?: string;
    showDuration?: boolean;
    showConnector?: boolean;
    showRetryBadge?: boolean;
    onStepClick?: (step: TimelineStepType) => void;
  };

function filterSteps(
  steps: TimelineStepType[],
  filter?: TimelineFilter
): TimelineStepType[] {
  if (!filter) {
    return steps;
  }

  return steps.filter((step) => {
    if (filter.status?.length && !filter.status.includes(step.status)) {
      return false;
    }
    if (filter.nodeTypes?.length && !filter.nodeTypes.includes(step.nodeType)) {
      return false;
    }
    if (!filter.showSkipped && step.status === "skipped") {
      return false;
    }
    if (!filter.showRetries && step.retryCount > 0 && step.attempt > 1) {
      return false;
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        step.nodeName.toLowerCase().includes(searchLower) ||
        step.nodeType.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
}

function sortSteps(
  steps: TimelineStepType[],
  sort?: TimelineSort
): TimelineStepType[] {
  if (!sort) {
    return steps;
  }

  return [...steps].sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case "startedAt":
        comparison = (a.startedAt ?? 0) - (b.startedAt ?? 0);
        break;
      case "completedAt":
        comparison = (a.completedAt ?? 0) - (b.completedAt ?? 0);
        break;
      case "durationMs":
        comparison = (a.durationMs ?? 0) - (b.durationMs ?? 0);
        break;
      case "nodeName":
        comparison = a.nodeName.localeCompare(b.nodeName);
        break;
      default:
        break;
    }

    return sort.direction === "desc" ? -comparison : comparison;
  });
}

const ExecutionTimeline = forwardRef<HTMLDivElement, ExecutionTimelineProps>(
  (
    {
      data,
      filter,
      sort,
      selectedStepId,
      size,
      showDuration = true,
      showConnector = true,
      showRetryBadge = true,
      onStepClick,
      className,
      ...props
    },
    ref
  ) => {
    const processedSteps = useMemo(() => {
      const filtered = filterSteps(data.steps, filter);
      return sortSteps(filtered, sort);
    }, [data.steps, filter, sort]);

    if (processedSteps.length === 0) {
      return (
        <TimelineEmptyState
          hasFilter={Boolean(
            filter?.status?.length ||
              filter?.nodeTypes?.length ||
              filter?.search
          )}
        />
      );
    }

    return (
      <div
        className={cn(executionTimelineVariants({ size }), className)}
        ref={ref}
        {...props}
      >
        {processedSteps.map((step, index) => (
          <TimelineStep
            isLast={index === processedSteps.length - 1}
            key={step.id}
            onClick={onStepClick}
            selected={selectedStepId === step.id}
            showConnector={showConnector}
            showDuration={showDuration}
            showRetryBadge={showRetryBadge}
            step={step}
          />
        ))}
      </div>
    );
  }
);
ExecutionTimeline.displayName = "ExecutionTimeline";

export { ExecutionTimeline, executionTimelineVariants };
export type { ExecutionTimelineProps };
