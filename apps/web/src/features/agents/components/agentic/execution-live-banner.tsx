"use client";

import { formatDurationPrecise, Icons } from "@openplane/ui";
import { cn } from "@openplane/ui/utils";
import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useEffect, useState } from "react";

type LiveBannerStatus = "RUNNING" | "WAITING_APPROVAL" | "WAITING_INPUT";

type ExecutionLiveBannerProps = {
  executionId: string;
  executionName?: string;
  status: LiveBannerStatus;
  startedAt?: number;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
};

const STATUS_CONFIG: Record<
  LiveBannerStatus,
  {
    label: string;
    actionLabel: string;
    dotClass: string;
    canDismiss: boolean;
  }
> = {
  RUNNING: {
    label: "Running",
    actionLabel: "View",
    dotClass: "bg-primary",
    canDismiss: true,
  },
  WAITING_APPROVAL: {
    label: "Needs approval",
    actionLabel: "Review",
    dotClass: "bg-amber-500",
    canDismiss: false,
  },
  WAITING_INPUT: {
    label: "Needs input",
    actionLabel: "Provide",
    dotClass: "bg-amber-500",
    canDismiss: false,
  },
};

const ExecutionLiveBanner = forwardRef<
  HTMLDivElement,
  ExecutionLiveBannerProps
>(
  (
    { executionName, status, startedAt, onAction, onDismiss, className },
    ref
  ) => {
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
      if (!startedAt || status !== "RUNNING") {
        setElapsedMs(0);
        return;
      }

      const updateElapsed = () => setElapsedMs(Date.now() - startedAt);
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }, [startedAt, status]);

    const config = STATUS_CONFIG[status];
    const isWaiting =
      status === "WAITING_INPUT" || status === "WAITING_APPROVAL";

    return (
      <AnimatePresence>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed top-3 right-3 z-50 flex items-center gap-2.5 rounded-sm border bg-background/95 px-3 py-2 shadow-sm backdrop-blur-sm",
            isWaiting ? "border-amber-500/40" : "border-border/40",
            className
          )}
          exit={{ opacity: 0, y: -10 }}
          initial={{ opacity: 0, y: -10 }}
          ref={ref}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <div className="relative flex items-center justify-center">
            <span className={cn("size-2 rounded-full", config.dotClass)} />
            {(status === "RUNNING" || isWaiting) && (
              <span
                className={cn(
                  "absolute size-2 animate-ping rounded-full opacity-75",
                  config.dotClass
                )}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="max-w-[140px] truncate font-medium text-[13px]">
              {executionName || "Execution"}
            </span>
            <span className="text-[13px] text-muted-foreground">·</span>
            <span className="text-[13px] text-muted-foreground">
              {config.label}
            </span>
            {elapsedMs > 0 && status === "RUNNING" && (
              <>
                <span className="text-[13px] text-muted-foreground">·</span>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {formatDurationPrecise(elapsedMs)}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 pl-1">
            <button
              aria-label={config.actionLabel}
              className={cn(
                "h-6 rounded-sm px-2 font-medium text-[12px] transition-colors",
                isWaiting
                  ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              onClick={onAction}
              type="button"
            >
              {config.actionLabel}
            </button>
            {config.canDismiss && onDismiss && (
              <button
                aria-label="Dismiss banner"
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                onClick={onDismiss}
                type="button"
              >
                <Icons.X size={12} />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }
);
ExecutionLiveBanner.displayName = "ExecutionLiveBanner";

export { ExecutionLiveBanner };
export type { ExecutionLiveBannerProps, LiveBannerStatus };
