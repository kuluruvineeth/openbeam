"use client";

import { Icons } from "@openplane/ui";
import { cva } from "class-variance-authority";
import { projectBudgetExhaustion } from "../lib/budget-utils";

const budgetAlertVariants = cva(
  "flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs",
  {
    variants: {
      severity: {
        warning: "border border-amber-500/20 bg-amber-500/10 text-amber-600",
        danger:
          "border border-destructive/20 bg-destructive/10 text-destructive",
        exceeded:
          "border border-destructive/30 bg-destructive/15 text-destructive",
      },
    },
  }
);

function formatTimeRemaining(exhaustionTimestamp: number): string {
  const remainingMs = exhaustionTimestamp - Date.now();
  if (remainingMs <= 0) {
    return "0 minutes";
  }

  const totalMinutes = Math.round(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hours ${minutes} minutes`;
  }
  if (hours > 0) {
    return `${hours} hours`;
  }
  return `${minutes} minutes`;
}

const ALERT_ICON_SIZE = 14;

type BudgetThreshold = "safe" | "warning" | "danger" | "exceeded";

type BudgetAlertProps = {
  threshold: BudgetThreshold;
  consumedCents: number;
  budgetCents: number;
  burnRatePerMinute: number;
};

function buildAlertMessage(
  threshold: BudgetThreshold,
  consumedCents: number,
  budgetCents: number,
  burnRatePerMinute: number
): string {
  if (threshold === "exceeded") {
    return "Budget exceeded. Mission will auto-pause.";
  }

  const exhaustionAt = projectBudgetExhaustion(
    consumedCents,
    budgetCents,
    burnRatePerMinute
  );

  const timeStr = exhaustionAt ? formatTimeRemaining(exhaustionAt) : "unknown";
  const percentage = Math.round((consumedCents / budgetCents) * 100);

  if (threshold === "danger") {
    return `Budget ${percentage}% consumed. Consider pausing non-critical agents. Exhaustion in ~${timeStr}.`;
  }

  return `Budget ${percentage}% consumed. At current rate, budget will be reached in ~${timeStr}.`;
}

export function BudgetAlert({
  threshold,
  consumedCents,
  budgetCents,
  burnRatePerMinute,
}: BudgetAlertProps) {
  if (threshold === "safe") {
    return null;
  }

  const severity = threshold === "warning" ? "warning" : threshold;

  return (
    <div className={budgetAlertVariants({ severity })}>
      <Icons.AlertCircle className="shrink-0" size={ALERT_ICON_SIZE} />
      <span>
        {buildAlertMessage(
          threshold,
          consumedCents,
          budgetCents,
          burnRatePerMinute
        )}
      </span>
    </div>
  );
}

export { budgetAlertVariants };
