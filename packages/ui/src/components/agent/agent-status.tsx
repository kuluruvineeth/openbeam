"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { TextShimmer } from "../text-shimmer";

const agentStatusVariants = cva(
  "inline-flex items-center gap-1.5 font-medium text-xs",
  {
    variants: {
      status: {
        idle: "text-muted-foreground",
        streaming: "text-foreground",
        thinking: "text-muted-foreground",
        error: "text-destructive",
        success: "text-emerald-600 dark:text-emerald-400",
        complete: "text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  }
);

type AgentStatusProps = React.ComponentProps<"span"> &
  VariantProps<typeof agentStatusVariants> & {
    isActive?: boolean;
    icon?: React.ReactNode;
  };

const AgentStatus = forwardRef<HTMLSpanElement, AgentStatusProps>(
  ({ className, status, isActive = false, icon, children, ...props }, ref) => {
    const content = (
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {children}
      </span>
    );

    return (
      <span
        className={cn(agentStatusVariants({ status }), className)}
        ref={ref}
        {...props}
      >
        {isActive &&
        status !== "error" &&
        status !== "success" &&
        status !== "complete" ? (
          <TextShimmer duration={1.5} spread={1.5}>
            {content}
          </TextShimmer>
        ) : (
          content
        )}
      </span>
    );
  }
);
AgentStatus.displayName = "AgentStatus";

export { AgentStatus, agentStatusVariants };
export type { AgentStatusProps };
