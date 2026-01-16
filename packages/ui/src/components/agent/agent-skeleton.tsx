"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Bot } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { Skeleton } from "../skeleton";

const agentSkeletonVariants = cva("flex gap-3 px-4 py-3", {
  variants: {
    variant: {
      message: "bg-background",
      compact: "bg-transparent py-2",
    },
  },
  defaultVariants: {
    variant: "message",
  },
});

type AgentSkeletonProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentSkeletonVariants> & {
    showAvatar?: boolean;
    lines?: number;
    showTools?: boolean;
    toolCount?: number;
  };

const AgentSkeleton = forwardRef<HTMLDivElement, AgentSkeletonProps>(
  (
    {
      className,
      variant,
      showAvatar = true,
      lines = 3,
      showTools = false,
      toolCount = 2,
      ...props
    },
    ref
  ) => {
    const lineWidths = ["w-full", "w-4/5", "w-3/5", "w-2/3", "w-1/2"];

    return (
      <div
        className={cn(agentSkeletonVariants({ variant }), className)}
        ref={ref}
        {...props}
      >
        {showAvatar && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-3">
          {showTools && (
            <div className="space-y-2">
              {Array.from({ length: toolCount }).map((_, index) => (
                <div
                  className="flex items-center gap-2"
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton placeholders
                  key={`tool-${index}`}
                >
                  <Skeleton className="size-5 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, index) => (
              <Skeleton
                className={cn("h-4", lineWidths[index % lineWidths.length])}
                // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton placeholders
                key={`line-${index}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);
AgentSkeleton.displayName = "AgentSkeleton";

const AgentSkeletonTool = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    className={cn("flex items-center gap-2 rounded-md border p-2", className)}
    ref={ref}
    {...props}
  >
    <Skeleton className="size-6 rounded" />
    <div className="flex-1 space-y-1">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-2 w-32" />
    </div>
  </div>
));
AgentSkeletonTool.displayName = "AgentSkeletonTool";

const AgentSkeletonThinking = forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2",
      className
    )}
    ref={ref}
    {...props}
  >
    <div className="flex gap-1">
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/40 delay-0" />
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/40 delay-150" />
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/40 delay-300" />
    </div>
    <Skeleton className="h-3 w-24" />
  </div>
));
AgentSkeletonThinking.displayName = "AgentSkeletonThinking";

export {
  AgentSkeleton,
  AgentSkeletonThinking,
  AgentSkeletonTool,
  agentSkeletonVariants,
};
export type { AgentSkeletonProps };
