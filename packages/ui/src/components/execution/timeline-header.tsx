"use client";

import type { ExecutionStatus } from "@openplane/types/canvas/execution";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import { Icons } from "../icons";
import { Progress } from "../progress";

const timelineHeaderVariants = cva("space-y-2", {
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

const statusConfig: Record<
  ExecutionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.FC<{ className?: string }>;
  }
> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Icons.Clock },
  RUNNING: { label: "Running", variant: "default", icon: Icons.Loader2 },
  WAITING_APPROVAL: {
    label: "Waiting Approval",
    variant: "outline",
    icon: Icons.UserCheck,
  },
  WAITING_INPUT: {
    label: "Waiting Input",
    variant: "outline",
    icon: Icons.FormInput,
  },
  COMPLETED: {
    label: "Completed",
    variant: "secondary",
    icon: Icons.CheckCircle2,
  },
  FAILED: { label: "Failed", variant: "destructive", icon: Icons.XCircle },
  CANCELLED: { label: "Cancelled", variant: "secondary", icon: Icons.Ban },
  TIMED_OUT: { label: "Timed Out", variant: "destructive", icon: Icons.Timer },
};

type TimelineHeaderProps = React.ComponentProps<"div"> &
  VariantProps<typeof timelineHeaderVariants> & {
    status: ExecutionStatus;
    progress: { completed: number; total: number; percentage: number };
    durationMs?: number;
    tokenUsage?: { input: number; output: number };
    showProgress?: boolean;
    showTokens?: boolean;
  };

const statusDotColors: Record<string, string> = {
  PENDING: "bg-muted-foreground",
  RUNNING: "bg-foreground",
  COMPLETED: "bg-[#00C853]",
  FAILED: "bg-destructive",
  CANCELLED: "bg-muted-foreground",
  TIMED_OUT: "bg-destructive",
  WAITING_APPROVAL: "bg-[#FFB300]",
  WAITING_INPUT: "bg-[#FFB300]",
};

const TimelineHeader = forwardRef<HTMLDivElement, TimelineHeaderProps>(
  (
    {
      status,
      progress,
      durationMs,
      tokenUsage,
      showProgress = true,
      showTokens = true,
      size,
      className,
      ...props
    },
    ref
  ) => {
    const config = statusConfig[status];
    const isRunning = status === "RUNNING";
    const isWaiting =
      status === "WAITING_APPROVAL" || status === "WAITING_INPUT";
    const dotColor = statusDotColors[status] ?? "bg-muted-foreground";

    return (
      <div
        className={cn(timelineHeaderVariants({ size }), className)}
        ref={ref}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex shrink-0 items-center justify-center">
              <span
                className={cn(
                  "size-2 rounded-full",
                  dotColor,
                  isRunning && "animate-pulse"
                )}
              />
              {isRunning && (
                <span
                  className={cn(
                    "absolute size-2 animate-ping rounded-full",
                    dotColor,
                    "opacity-75"
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "font-medium text-[13px]",
                status === "COMPLETED" && "text-[#00C853]",
                status === "FAILED" && "text-destructive",
                isWaiting && "text-[#FFB300]",
                (status === "PENDING" || status === "CANCELLED") &&
                  "text-muted-foreground"
              )}
            >
              {config.label}
            </span>
            {durationMs != null && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatDurationPrecise(durationMs)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            {showTokens && tokenUsage && (
              <>
                <span className="tabular-nums">
                  {(tokenUsage.input + tokenUsage.output).toLocaleString()}{" "}
                  tokens
                </span>
                <span className="text-muted-foreground/40">·</span>
              </>
            )}
            <span className="tabular-nums">
              {progress.completed}/{progress.total} steps
            </span>
          </div>
        </div>

        {showProgress && (
          <Progress
            className={cn(
              "h-1",
              "[&>div]:bg-muted-foreground/20",
              isRunning && "[&>div]:animate-pulse [&>div]:bg-foreground/30",
              status === "FAILED" && "[&>div]:bg-destructive/30",
              status === "COMPLETED" && "[&>div]:bg-[#00C853]/30",
              isWaiting && "[&>div]:bg-[#FFB300]/30"
            )}
            value={progress.percentage}
          />
        )}
      </div>
    );
  }
);
TimelineHeader.displayName = "TimelineHeader";

export { TimelineHeader, timelineHeaderVariants, statusConfig };
export type { TimelineHeaderProps };
