"use client";

import { cn } from "@openplane/ui";
import { formatCents } from "../lib/budget-utils";

const TIER_THRESHOLDS = {
  economy: 0.6,
  critical: 0.85,
  stop: 0.95,
} as const;

type BudgetPressureBarProps = {
  consumedCents: number;
  budgetCents: number;
  tier?: string;
};

export function BudgetPressureBar({
  consumedCents,
  budgetCents,
  tier,
}: BudgetPressureBarProps) {
  if (budgetCents <= 0) {
    return null;
  }

  const ratio = Math.min(consumedCents / budgetCents, 1);
  const economyPx = TIER_THRESHOLDS.economy * 100;
  const criticalPx = (TIER_THRESHOLDS.critical - TIER_THRESHOLDS.economy) * 100;
  const stopPx = (TIER_THRESHOLDS.stop - TIER_THRESHOLDS.critical) * 100;
  const deadPx = (1 - TIER_THRESHOLDS.stop) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">
          {formatCents(consumedCents)} / {formatCents(budgetCents)}
        </span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {(ratio * 100).toFixed(1)}%
        </span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-sm bg-muted">
        <div className="flex h-full">
          <div
            className="h-full bg-emerald-500/30 dark:bg-emerald-500/20"
            style={{ width: `${economyPx}%` }}
          />
          <div
            className="h-full bg-amber-500/30 dark:bg-amber-500/20"
            style={{ width: `${criticalPx}%` }}
          />
          <div
            className="h-full bg-destructive/30 dark:bg-destructive/20"
            style={{ width: `${stopPx}%` }}
          />
          <div
            className="h-full bg-muted-foreground/20"
            style={{ width: `${deadPx}%` }}
          />
        </div>

        <div
          className={cn(
            "absolute top-0 left-0 h-full transition-all duration-300",
            tier === "stopped" && "bg-muted-foreground",
            tier === "critical" && "bg-destructive",
            tier === "economy" && "bg-amber-500",
            (!tier || tier === "full") && "bg-emerald-500"
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>60%</span>
        <span>85%</span>
        <span>95%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
