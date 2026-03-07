"use client";

import type { ControlIssuePriority } from "@openbeam/types/control";
import { cva, type VariantProps } from "class-variance-authority";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ISSUE_PRIORITY_META } from "../../constants";

const priorityVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-medium text-xs",
  {
    variants: {
      size: {
        sm: "px-1 py-px text-[10px]",
        default: "px-1.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const PRIORITY_ICONS: Record<ControlIssuePriority, React.ReactNode> = {
  CRITICAL: <Icons.AlertCircle size={12} />,
  HIGH: <Icons.ArrowUp size={12} />,
  MEDIUM: <Icons.Minus size={12} />,
  LOW: <Icons.ArrowDown size={12} />,
};

type PriorityBadgeProps = {
  priority: ControlIssuePriority;
  showIcon?: boolean;
  className?: string;
} & VariantProps<typeof priorityVariants>;

export function PriorityBadge({
  priority,
  showIcon = true,
  size,
  className,
}: PriorityBadgeProps) {
  const meta = ISSUE_PRIORITY_META[priority];

  return (
    <span className={cn(priorityVariants({ size }), meta.color, className)}>
      {showIcon && PRIORITY_ICONS[priority]}
      {meta.label}
    </span>
  );
}
