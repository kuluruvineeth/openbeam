"use client";

import { Progress } from "@openbeam/ui";
import { cn } from "@/lib/utils";
import { MetricCard } from "../shared/metric-card";

type CostSummary = {
  totalSpendCents: number;
  budgetMonthlyCents: number;
  burnRateDailyCents: number;
  projectedMonthEndCents: number;
};

type CostSummaryCardsProps = {
  summary: CostSummary;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CostSummaryCards({ summary }: CostSummaryCardsProps) {
  const utilization =
    summary.budgetMonthlyCents > 0
      ? (summary.totalSpendCents / summary.budgetMonthlyCents) * 100
      : 0;
  const isOverBudget = utilization > 90;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          detail={`of ${formatCents(summary.budgetMonthlyCents)} budget`}
          label="Total Spend"
          value={formatCents(summary.totalSpendCents)}
        />
        <MetricCard
          detail="remaining this month"
          label="Budget Remaining"
          value={formatCents(
            summary.budgetMonthlyCents - summary.totalSpendCents
          )}
        />
        <MetricCard
          detail="average daily cost"
          label="Burn Rate"
          value={formatCents(summary.burnRateDailyCents)}
        />
        <MetricCard
          detail="at current rate"
          label="Projected Month End"
          value={formatCents(summary.projectedMonthEndCents)}
        />
      </div>

      {summary.budgetMonthlyCents > 0 && (
        <div className="rounded-sm border border-border/50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Budget Utilization</span>
            <span
              className={cn(
                "font-medium tabular-nums",
                isOverBudget && "text-red-600"
              )}
            >
              {utilization.toFixed(1)}%
            </span>
          </div>
          <Progress
            className={cn("h-2", isOverBudget && "[&>div]:bg-red-500")}
            value={Math.min(utilization, 100)}
          />
        </div>
      )}
    </div>
  );
}
