"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const agentToolIconVariants = cva(
  "flex shrink-0 items-center justify-center rounded-sm",
  {
    variants: {
      category: {
        search: "bg-blue-500/10 text-blue-500",
        read: "bg-emerald-500/10 text-emerald-500",
        write: "bg-amber-500/10 text-amber-500",
        execute: "bg-purple-500/10 text-purple-500",
        navigate: "bg-cyan-500/10 text-cyan-500",
        default: "bg-muted text-muted-foreground",
      },
      size: {
        sm: "size-5",
        md: "size-6",
        lg: "size-8",
      },
    },
    defaultVariants: {
      category: "default",
      size: "md",
    },
  }
);

type AgentToolIconProps = React.ComponentProps<"span"> &
  VariantProps<typeof agentToolIconVariants> & {
    icon?: React.ReactNode;
  };

const AgentToolIcon = forwardRef<HTMLSpanElement, AgentToolIconProps>(
  ({ className, category, size, icon, children, ...props }, ref) => (
    <span
      className={cn(agentToolIconVariants({ category, size }), className)}
      ref={ref}
      {...props}
    >
      {icon ?? children}
    </span>
  )
);
AgentToolIcon.displayName = "AgentToolIcon";

export { AgentToolIcon, agentToolIconVariants };
export type { AgentToolIconProps };
