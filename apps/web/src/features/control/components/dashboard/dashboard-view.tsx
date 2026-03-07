"use client";

import { useControlDashboard } from "../../hooks/use-control-dashboard";
import { AgentsSummary } from "./agents-summary";
import { CostBurn } from "./cost-burn";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { IssuesSummary } from "./issues-summary";
import { PendingApprovals } from "./pending-approvals";
import { RecentActivity } from "./recent-activity";

export function DashboardView() {
  const { summary, recentActivity, isLoading } = useControlDashboard();

  if (isLoading || !summary) {
    return <DashboardSkeleton />;
  }

  const agentCounts = {
    active: (summary.agents.running ?? 0) + (summary.agents.idle ?? 0),
    running: summary.agents.running ?? 0,
    paused: summary.agents.paused ?? 0,
    error: summary.agents.error ?? 0,
    idle: summary.agents.idle ?? 0,
    total: summary.agents.total ?? 0,
  };

  const issueBreakdown = {
    open: (summary.issues.backlog ?? 0) + (summary.issues.todo ?? 0),
    inProgress: summary.issues.inProgress ?? 0,
    blocked: 0,
    done: summary.issues.done ?? 0,
    total: summary.issues.total ?? 0,
  };

  const costMetrics = {
    monthSpendCents: summary.costs.spendCents ?? 0,
    monthBudgetCents: 0,
    monthUtilizationPercent: 0,
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-semibold text-lg">Control Plane</h1>

      <div className="grid grid-cols-4 gap-3">
        <AgentsSummary agents={agentCounts} />
        <IssuesSummary issues={issueBreakdown} />
        <CostBurn costs={costMetrics} />
        <PendingApprovals count={summary.pendingApprovalCount ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RecentActivity entries={recentActivity ?? []} />
        <div className="space-y-3">
          <IssuesSummary expanded issues={issueBreakdown} />
        </div>
      </div>
    </div>
  );
}
