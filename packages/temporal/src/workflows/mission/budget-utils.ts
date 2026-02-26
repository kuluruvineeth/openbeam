import type { BudgetThresholds, BudgetTier } from "@openplane/types/ai/budget";

export function computeBudgetTier(
  consumed: number,
  budget: number,
  thresholds: BudgetThresholds
): BudgetTier {
  if (budget <= 0) {
    return "stopped";
  }

  const ratio = consumed / budget;

  if (ratio >= thresholds.stopAt) {
    return "stopped";
  }
  if (ratio >= thresholds.criticalAt) {
    return "critical";
  }
  if (ratio >= thresholds.economyAt) {
    return "economy";
  }
  return "full";
}
