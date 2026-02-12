"use client";

import { cva } from "class-variance-authority";
import { useMemo } from "react";
import {
  computeBudgetThreshold,
  formatBurnRate,
  formatCents,
  projectBudgetExhaustion,
} from "../lib/budget-utils";
import {
  useBudgetPercentage,
  useBudgetState,
} from "../stores/mission-runtime-store";
import { BudgetProgressBar } from "./budget-progress-bar";

const budgetStatusVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-xs",
  {
    variants: {
      status: {
        safe: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        danger: "bg-destructive/10 text-destructive",
        exceeded: "animate-pulse bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { status: "safe" },
  }
);

const STATUS_LABELS: Record<string, string> = {
  safe: "Healthy",
  warning: "Warning",
  danger: "Critical",
  exceeded: "Exceeded",
};

function formatMinutesRemaining(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  }
  return `${Math.round(minutes)}m`;
}

type AgentCostBar = {
  agentId: string;
  costCents: number;
  percentage: number;
};

export function MissionLedger() {
  const budget = useBudgetState();
  const budgetPct = useBudgetPercentage();
  const threshold = computeBudgetThreshold(
    budget.consumedCents,
    budget.budgetCents
  );

  const exhaustionMs = useMemo(
    () =>
      projectBudgetExhaustion(
        budget.consumedCents,
        budget.budgetCents,
        budget.burnRateCentsPerMinute
      ),
    [budget.consumedCents, budget.budgetCents, budget.burnRateCentsPerMinute]
  );

  const minutesRemaining = useMemo(() => {
    if (!exhaustionMs) {
      return null;
    }
    const diff = exhaustionMs - Date.now();
    return diff > 0 ? diff / 60_000 : 0;
  }, [exhaustionMs]);

  const agentBars = useMemo((): AgentCostBar[] => {
    const entries = Object.entries(budget.perAgentCosts);
    const totalAgentCost = entries.reduce((sum, [, cost]) => sum + cost, 0);
    return entries
      .sort(([, a], [, b]) => b - a)
      .map(([agentId, costCents]) => ({
        agentId,
        costCents,
        percentage: totalAgentCost > 0 ? (costCents / totalAgentCost) * 100 : 0,
      }));
  }, [budget.perAgentCosts]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border/50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-medium text-sm">Budget</span>
          <span className={budgetStatusVariants({ status: threshold })}>
            {STATUS_LABELS[threshold]}
          </span>
        </div>
        <BudgetProgressBar
          budgetCents={budget.budgetCents}
          consumedCents={budget.consumedCents}
        />
      </div>

      <div className="rounded-md border border-border/50 p-3">
        <span className="mb-2 block font-medium text-sm">Burn rate</span>
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-lg tabular-nums">
            {formatBurnRate(budget.burnRateCentsPerMinute)}
          </span>
          {minutesRemaining !== null && (
            <span className="text-muted-foreground text-xs">
              {minutesRemaining > 0
                ? `~${formatMinutesRemaining(minutesRemaining)} remaining`
                : "Budget exhausted"}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-md border border-border/50 p-3">
        <span className="mb-2 block font-medium text-sm">Per-agent cost</span>
        {agentBars.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            No agent cost data
          </span>
        ) : (
          <div className="flex flex-col gap-2">
            {agentBars.map((bar) => (
              <div className="flex flex-col gap-1" key={bar.agentId}>
                <div className="flex items-baseline justify-between">
                  <span className="truncate text-xs">{bar.agentId}</span>
                  <span className="ml-2 shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                    {formatCents(bar.costCents)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-sm bg-muted">
                  <div
                    className="h-full rounded-sm bg-primary transition-all"
                    style={{ width: `${Math.min(bar.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-border/50 p-3">
        <span className="mb-1 block font-medium text-sm">Summary</span>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Total spent</dt>
          <dd className="text-right font-mono tabular-nums">
            {formatCents(budget.consumedCents)}
          </dd>
          <dt className="text-muted-foreground">Budget</dt>
          <dd className="text-right font-mono tabular-nums">
            {budget.budgetCents > 0
              ? formatCents(budget.budgetCents)
              : "No limit"}
          </dd>
          <dt className="text-muted-foreground">Utilization</dt>
          <dd className="text-right font-mono tabular-nums">
            {budgetPct.toFixed(1)}%
          </dd>
          <dt className="text-muted-foreground">Agents</dt>
          <dd className="text-right font-mono tabular-nums">
            {agentBars.length}
          </dd>
        </dl>
      </div>
    </div>
  );
}

export { budgetStatusVariants };
