"use client";

import { cva } from "class-variance-authority";
import { computeBudgetThreshold, formatCents } from "../lib/budget-utils";

const budgetBarVariants = cva("h-2 rounded-sm transition-all", {
  variants: {
    threshold: {
      safe: "bg-primary",
      warning: "bg-amber-500",
      danger: "bg-destructive",
      exceeded: "animate-pulse bg-destructive",
    },
  },
  defaultVariants: { threshold: "safe" },
});

type BudgetProgressBarProps = {
  consumedCents: number;
  budgetCents: number;
};

export function BudgetProgressBar({
  consumedCents,
  budgetCents,
}: BudgetProgressBarProps) {
  const hasBudget = budgetCents > 0;
  const threshold = hasBudget
    ? computeBudgetThreshold(consumedCents, budgetCents)
    : "safe";
  const percentage = hasBudget ? (consumedCents / budgetCents) * 100 : 0;
  const clampedWidth = Math.min(percentage, 100);

  if (!hasBudget) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-sm">
            {formatCents(consumedCents)}
          </span>
          <span className="text-muted-foreground text-xs">No budget set</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-sm">
          {formatCents(consumedCents)} / {formatCents(budgetCents)}
        </span>
        <span className="font-mono text-muted-foreground text-xs tabular-nums">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-muted">
        <div
          className={budgetBarVariants({ threshold })}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-muted-foreground text-xs tabular-nums">
        <span>{formatCents(consumedCents)}</span>
        <span>{formatCents(budgetCents)}</span>
      </div>
    </div>
  );
}

export { budgetBarVariants };
