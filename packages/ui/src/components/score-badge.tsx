"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

function scoreToLevel(score: number): "low" | "medium" | "high" {
  if (score >= 80) {
    return "high";
  }
  if (score >= 50) {
    return "medium";
  }
  return "low";
}

const scoreBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[11px] tabular-nums",
  {
    variants: {
      level: {
        high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        low: "bg-red-500/15 text-red-600 dark:text-red-400",
      },
    },
    defaultVariants: {
      level: "medium",
    },
  }
);

type ScoreBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  Omit<VariantProps<typeof scoreBadgeVariants>, "level"> & {
    score: number;
    format?: "percent" | "number";
  };

const ScoreBadge = React.forwardRef<HTMLSpanElement, ScoreBadgeProps>(
  ({ className, score, format = "percent", ...props }, ref) => {
    const level = scoreToLevel(score);
    const display =
      format === "percent"
        ? `${Math.round(score)}%`
        : String(Math.round(score));

    return (
      <span
        className={cn(scoreBadgeVariants({ level }), className)}
        ref={ref}
        {...props}
      >
        {display}
      </span>
    );
  }
);
ScoreBadge.displayName = "ScoreBadge";

export { ScoreBadge, scoreBadgeVariants };
export type { ScoreBadgeProps };
