"use client";

import type { TimelineStepStatus } from "@openplane/types/canvas/timeline";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const timelineStepIndicatorVariants = cva(
  "relative flex shrink-0 items-center justify-center",
  {
    variants: {
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const dotSizeVariants = cva("rounded-full", {
  variants: {
    size: {
      sm: "size-[5px]",
      md: "size-[6px]",
      lg: "size-2",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const statusDotColors: Record<TimelineStepStatus, string> = {
  pending: "bg-muted-foreground/50",
  queued: "bg-muted-foreground",
  running: "bg-foreground",
  success: "bg-[#00C853]",
  error: "bg-destructive",
  skipped: "bg-muted-foreground/30",
  cancelled: "bg-muted-foreground",
};

type TimelineStepIndicatorProps = React.ComponentProps<"div"> &
  VariantProps<typeof timelineStepIndicatorVariants> & {
    status: TimelineStepStatus;
  };

const TimelineStepIndicator = forwardRef<
  HTMLDivElement,
  TimelineStepIndicatorProps
>(({ status, size, className, ...props }, ref) => {
  const isRunning = status === "running";
  const dotColor = statusDotColors[status];

  return (
    <div
      className={cn(timelineStepIndicatorVariants({ size }), className)}
      ref={ref}
      {...props}
    >
      <span
        className={cn(
          dotSizeVariants({ size }),
          dotColor,
          isRunning && "animate-pulse"
        )}
      />
      {isRunning && (
        <span
          className={cn(
            "absolute animate-ping rounded-full opacity-75",
            dotSizeVariants({ size }),
            dotColor
          )}
        />
      )}
    </div>
  );
});
TimelineStepIndicator.displayName = "TimelineStepIndicator";

export { TimelineStepIndicator, timelineStepIndicatorVariants };
export type { TimelineStepIndicatorProps };
