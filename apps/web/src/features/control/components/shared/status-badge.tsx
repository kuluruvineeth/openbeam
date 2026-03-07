"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  AGENT_STATUS_META,
  APPROVAL_STATUS_META,
  GOAL_STATUS_META,
  ISSUE_STATUS_META,
  PROJECT_STATUS_META,
  RUN_STATUS_META,
} from "../../constants";

const badgeVariants = cva(
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

type StatusDomain = "agent" | "issue" | "project" | "goal" | "approval" | "run";

const META_MAP: Record<
  StatusDomain,
  Record<string, { label: string; color: string; dotColor: string }>
> = {
  agent: AGENT_STATUS_META,
  issue: ISSUE_STATUS_META,
  project: PROJECT_STATUS_META,
  goal: GOAL_STATUS_META,
  approval: APPROVAL_STATUS_META,
  run: RUN_STATUS_META,
};

type StatusBadgeProps = {
  status: string;
  domain: StatusDomain;
  showDot?: boolean;
  className?: string;
} & VariantProps<typeof badgeVariants>;

export function StatusBadge({
  status,
  domain,
  showDot = true,
  size,
  className,
}: StatusBadgeProps) {
  const meta = META_MAP[domain]?.[status];
  if (!meta) {
    return (
      <span
        className={cn(
          badgeVariants({ size }),
          "bg-zinc-500/10 text-zinc-500",
          className
        )}
      >
        {status}
      </span>
    );
  }

  return (
    <span className={cn(badgeVariants({ size }), meta.color, className)}>
      {showDot && (
        <span className={cn("size-1.5 rounded-full", meta.dotColor)} />
      )}
      {meta.label}
    </span>
  );
}
