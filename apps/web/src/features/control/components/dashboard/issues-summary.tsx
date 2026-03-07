"use client";

import type { ControlIssueBreakdown } from "@openbeam/types/control";
import { cn } from "@/lib/utils";
import { MetricCard } from "../shared/metric-card";

type IssuesSummaryProps = {
  issues: ControlIssueBreakdown;
  expanded?: boolean;
};

export function IssuesSummary({ issues, expanded }: IssuesSummaryProps) {
  if (expanded) {
    return (
      <div className="space-y-3">
        <h2 className="font-medium text-sm">Issues Breakdown</h2>
        <div className="space-y-1.5">
          <BreakdownRow count={issues.open} label="Open" total={issues.total} />
          <BreakdownRow
            count={issues.inProgress}
            label="In Progress"
            total={issues.total}
          />
          <BreakdownRow
            count={issues.blocked}
            label="Blocked"
            total={issues.total}
            variant="destructive"
          />
          <BreakdownRow
            count={issues.done}
            label="Done"
            total={issues.total}
            variant="success"
          />
        </div>
      </div>
    );
  }

  const detail = [
    issues.inProgress > 0 && `${issues.inProgress} in progress`,
    issues.blocked > 0 && `${issues.blocked} blocked`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <MetricCard
      detail={detail || "No active issues"}
      label="Open Issues"
      value={issues.open}
    />
  );
}

function BreakdownRow({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant?: "destructive" | "success";
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-muted-foreground text-xs">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            variant === "destructive" && "bg-red-500",
            variant === "success" && "bg-emerald-500",
            !variant && "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium text-xs tabular-nums">
        {count}
      </span>
    </div>
  );
}
