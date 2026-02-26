"use client";

import { cva, type VariantProps } from "class-variance-authority";

const TIER_LABELS = {
  full: "Full",
  economy: "Economy",
  critical: "Critical",
  stopped: "Stopped",
} as const;

type BudgetTier = keyof typeof TIER_LABELS;

const budgetTierBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-medium text-xs",
  {
    variants: {
      tier: {
        full: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        economy: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        critical: "bg-destructive/10 text-destructive",
        stopped: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { tier: "full" },
  }
);

type BudgetTierBadgeProps = {
  tier: string;
} & Omit<VariantProps<typeof budgetTierBadgeVariants>, "tier">;

function resolveTier(raw: string): BudgetTier {
  return raw in TIER_LABELS ? (raw as BudgetTier) : "full";
}

export function BudgetTierBadge({ tier }: BudgetTierBadgeProps) {
  const resolved = resolveTier(tier);

  return (
    <span className={budgetTierBadgeVariants({ tier: resolved })}>
      {resolved === "critical" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
      )}
      {TIER_LABELS[resolved]}
    </span>
  );
}

export { budgetTierBadgeVariants, type BudgetTier };
