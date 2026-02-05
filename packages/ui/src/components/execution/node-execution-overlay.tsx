"use client";

import type { NodeExecutionOverlay as NodeExecutionOverlayType } from "@openplane/types/canvas/execution-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { formatDurationPrecise } from "../../utils/format";
import { Icons } from "../icons";

const nodeExecutionOverlayVariants = cva(
  "pointer-events-none absolute inset-0 z-10",
  {
    variants: {
      status: {
        pending: "",
        queued: "",
        running: "",
        success: "",
        error: "",
        skipped: "",
        cancelled: "",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

const nodeStatusRingVariants = cva(
  "absolute inset-0 rounded-md border-2 transition-all",
  {
    variants: {
      status: {
        pending: "border-transparent",
        queued: "animate-pulse border-muted-foreground/30",
        running:
          "animate-pulse border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]",
        success: "border-green-500",
        error: "border-destructive",
        skipped: "border-muted-foreground/30 border-dashed",
        cancelled: "border-orange-500 border-dashed",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

const nodeStatusBadgeVariants = cva(
  "-top-2 -right-2 absolute flex items-center justify-center rounded-full border shadow-sm",
  {
    variants: {
      status: {
        pending: "hidden",
        queued: "size-5 border-muted-foreground/30 bg-muted",
        running: "size-6 border-primary bg-primary",
        success: "size-5 border-green-500 bg-green-500",
        error: "size-5 border-destructive bg-destructive",
        skipped: "size-5 border-muted-foreground/30 bg-muted",
        cancelled: "size-5 border-orange-500 bg-orange-500",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

type NodeExecutionOverlayProps = React.ComponentProps<"div"> &
  VariantProps<typeof nodeExecutionOverlayVariants> & {
    overlay: NodeExecutionOverlayType;
    showDuration?: boolean;
    showProgress?: boolean;
  };

const statusIcons: Record<string, React.FC<{ className?: string }>> = {
  queued: Icons.Clock,
  running: Icons.Loader2,
  success: Icons.Check,
  error: Icons.X,
  skipped: Icons.Minus,
  cancelled: Icons.Square,
};

const NodeExecutionOverlay = forwardRef<
  HTMLDivElement,
  NodeExecutionOverlayProps
>(
  (
    { overlay, showDuration = true, showProgress = true, className, ...props },
    ref
  ) => {
    const { status, progress, durationMs, isActive } = overlay;
    const StatusIcon = statusIcons[status];

    if (status === "pending" && !isActive) {
      return null;
    }

    return (
      <div
        className={cn(nodeExecutionOverlayVariants({ status }), className)}
        ref={ref}
        {...props}
      >
        <div className={nodeStatusRingVariants({ status })} />

        {status !== "pending" && StatusIcon && (
          <div className={nodeStatusBadgeVariants({ status })}>
            <StatusIcon
              className={cn(
                "size-3 text-white",
                status === "running" && "animate-spin"
              )}
            />
          </div>
        )}

        {showProgress && status === "running" && progress !== undefined && (
          <div className="-bottom-1 -translate-x-1/2 absolute left-1/2">
            <div className="rounded-full border bg-background px-1.5 py-0.5 font-medium text-[10px] shadow-sm">
              {Math.round(progress)}%
            </div>
          </div>
        )}

        {showDuration &&
          (status === "success" || status === "error") &&
          durationMs !== undefined && (
            <div className="-bottom-1 -translate-x-1/2 absolute left-1/2">
              <div className="rounded-full border bg-background px-1.5 py-0.5 font-medium text-[10px] tabular-nums shadow-sm">
                {formatDurationPrecise(durationMs)}
              </div>
            </div>
          )}
      </div>
    );
  }
);
NodeExecutionOverlay.displayName = "NodeExecutionOverlay";

export {
  NodeExecutionOverlay,
  nodeExecutionOverlayVariants,
  nodeStatusRingVariants,
  nodeStatusBadgeVariants,
};
export type { NodeExecutionOverlayProps };
