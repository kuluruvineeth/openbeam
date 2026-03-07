"use client";

import type { ControlCostMetrics } from "@openbeam/types/control";
import { cn } from "@/lib/utils";
import { MetricCard } from "../shared/metric-card";

type CostBurnProps = {
  costs: ControlCostMetrics;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CostBurn({ costs }: CostBurnProps) {
  const utilization = costs.monthUtilizationPercent;
  const isOverBudget = utilization > 100;

  return (
    <MetricCard
      className={cn(isOverBudget && "border-red-500/30")}
      detail={`${formatCents(costs.monthSpendCents)} / ${formatCents(costs.monthBudgetCents)}`}
      label="Budget Usage"
      value={`${Math.round(utilization)}%`}
    />
  );
}
