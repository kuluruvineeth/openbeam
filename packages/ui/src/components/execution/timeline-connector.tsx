"use client";

import type { TimelineStepStatus } from "@openplane/types/canvas/timeline";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const timelineConnectorVariants = cva("w-px bg-border/50 transition-colors", {
  variants: {
    status: {
      pending: "",
      queued: "",
      running: "bg-muted-foreground/30",
      success: "bg-[#00C853]/30",
      error: "bg-destructive/30",
      skipped: "bg-border/30",
      cancelled: "bg-border/30",
    },
    size: {
      sm: "min-h-3",
      md: "min-h-5",
      lg: "min-h-6",
    },
  },
  defaultVariants: {
    status: "pending",
    size: "md",
  },
});

type TimelineConnectorProps = React.ComponentProps<"div"> &
  VariantProps<typeof timelineConnectorVariants> & {
    status?: TimelineStepStatus;
  };

const TimelineConnector = forwardRef<HTMLDivElement, TimelineConnectorProps>(
  ({ status = "pending", size, className, ...props }, ref) => (
    <div
      className={cn(
        timelineConnectorVariants({ status, size }),
        "flex-1",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
TimelineConnector.displayName = "TimelineConnector";

export { TimelineConnector, timelineConnectorVariants };
export type { TimelineConnectorProps };
