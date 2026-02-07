"use client";

import type { TimelineStep as TimelineStepType } from "@openplane/types/canvas/timeline";
import { forwardRef, useMemo } from "react";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";
import { getNodeIcon } from "./timeline-step";

type TimelineGanttProps = React.ComponentProps<"div"> & {
  steps: TimelineStepType[];
  startTime: number;
  endTime?: number;
  selectedStepId?: string;
  onStepClick?: (step: TimelineStepType) => void;
};

const statusColors: Record<string, string> = {
  pending: "bg-muted",
  queued: "bg-muted-foreground/30",
  running: "bg-primary animate-pulse",
  success: "bg-green-500",
  error: "bg-destructive",
  skipped: "bg-muted-foreground/20",
  cancelled: "bg-orange-500",
};

const TimelineGantt = forwardRef<HTMLDivElement, TimelineGanttProps>(
  (
    {
      steps,
      startTime,
      endTime,
      selectedStepId,
      onStepClick,
      className,
      ...props
    },
    ref
  ) => {
    const { totalDuration, rows } = useMemo(() => {
      const effectiveEndTime = endTime ?? Date.now();
      const duration = effectiveEndTime - startTime;

      const sortedSteps = [...steps].sort(
        (a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0)
      );

      const rowAssignments: { step: TimelineStepType; row: number }[] = [];
      const rowEndTimes: number[] = [];

      for (const step of sortedSteps) {
        const stepStart = step.startedAt ?? startTime;
        let assignedRow = 0;

        for (let i = 0; i < rowEndTimes.length; i++) {
          const rowEndTime = rowEndTimes[i];
          if (rowEndTime !== undefined && rowEndTime <= stepStart) {
            assignedRow = i;
            break;
          }
          assignedRow = i + 1;
        }

        const stepEnd = step.completedAt ?? effectiveEndTime;
        rowEndTimes[assignedRow] = stepEnd;
        rowAssignments.push({ step, row: assignedRow });
      }

      return { totalDuration: duration, rows: rowAssignments };
    }, [steps, startTime, endTime]);

    const maxRows = Math.max(...rows.map((r) => r.row), 0) + 1;
    const rowHeight = 28;

    return (
      <div className={cn("relative", className)} ref={ref} {...props}>
        <div className="mb-2 flex items-center justify-between text-muted-foreground text-xs">
          <span>Start</span>
          <span>{formatDurationPrecise(totalDuration)}</span>
        </div>

        <div
          className="relative rounded-md border bg-muted/20"
          style={{ height: maxRows * rowHeight + 8 }}
        >
          <TooltipProvider delayDuration={200}>
            {rows.map(({ step, row }) => {
              const stepStart = step.startedAt ?? startTime;
              const stepEnd = step.completedAt ?? endTime ?? Date.now();
              const left = ((stepStart - startTime) / totalDuration) * 100;
              const width = Math.max(
                ((stepEnd - stepStart) / totalDuration) * 100,
                1
              );
              const Icon = getNodeIcon(step.nodeType);
              const isSelected = selectedStepId === step.id;

              return (
                <Tooltip key={step.id}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "absolute flex items-center gap-1 rounded px-1.5 text-white text-xs transition-all",
                        statusColors[step.status],
                        isSelected && "ring-2 ring-primary ring-offset-1",
                        onStepClick && "cursor-pointer hover:brightness-110"
                      )}
                      onClick={() => onStepClick?.(step)}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        top: row * rowHeight + 4,
                        height: rowHeight - 4,
                        minWidth: 24,
                      }}
                      type="button"
                    >
                      <Icon className="size-3 shrink-0" />
                      {width > 8 && (
                        <span className="truncate text-[10px]">
                          {step.nodeName}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" side="top">
                    <div className="space-y-1">
                      <p className="font-medium">{step.nodeName}</p>
                      <p className="text-muted-foreground text-xs">
                        {step.nodeType} • {step.status}
                      </p>
                      {step.durationMs != null && (
                        <p className="text-xs">
                          Duration: {formatDurationPrecise(step.durationMs)}
                        </p>
                      )}
                      {step.error && (
                        <p className="line-clamp-2 text-destructive text-xs">
                          {step.error}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
    );
  }
);
TimelineGantt.displayName = "TimelineGantt";

export { TimelineGantt };
export type { TimelineGanttProps };
