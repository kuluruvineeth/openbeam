"use client";

import { cva, type VariantProps } from "class-variance-authority";

const riskBadgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 font-medium text-xs",
  {
    variants: {
      risk: {
        low: "bg-emerald-500/10 text-emerald-600 opacity-80",
        medium: "bg-amber-500/10 text-amber-600",
        high: "bg-orange-500/10 text-orange-600",
        critical: "animate-pulse bg-red-500/10 text-red-600",
      },
    },
  }
);

type ApprovalRiskBadgeProps = VariantProps<typeof riskBadgeVariants> & {
  label?: string;
};

export function ApprovalRiskBadge({ risk, label }: ApprovalRiskBadgeProps) {
  return <span className={riskBadgeVariants({ risk })}>{label ?? risk}</span>;
}

export { riskBadgeVariants };
