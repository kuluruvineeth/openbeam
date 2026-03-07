import {
  aggregateControlCosts,
  countControlAgents,
  countControlIssues,
  type Database,
  listControlActivityLogs,
  listControlApprovals,
  listControlIssues,
} from "@openbeam/db";

export async function getControlDashboardSummary(db: Database, teamId: string) {
  const [agentCounts, issueCounts, costSummary, pendingApprovals] =
    await Promise.all([
      getAgentStatusCounts(db, teamId),
      getIssueBreakdown(db, teamId),
      getMonthlyCostMetrics(db, teamId),
      listControlApprovals(db, teamId, { status: "PENDING" as never }),
    ]);

  return {
    agents: agentCounts,
    issues: issueCounts,
    costs: costSummary,
    pendingApprovalCount: pendingApprovals.length,
  };
}

async function getAgentStatusCounts(db: Database, teamId: string) {
  const [idle, running, paused, error, total] = await Promise.all([
    countControlAgents(db, teamId, "IDLE" as never),
    countControlAgents(db, teamId, "RUNNING" as never),
    countControlAgents(db, teamId, "PAUSED" as never),
    countControlAgents(db, teamId, "ERROR" as never),
    countControlAgents(db, teamId),
  ]);

  return { idle, running, paused, error, total };
}

async function getIssueBreakdown(db: Database, teamId: string) {
  const [backlog, todo, inProgress, done, cancelled, total] = await Promise.all(
    [
      countControlIssues(db, teamId, "BACKLOG" as never),
      countControlIssues(db, teamId, "TODO" as never),
      countControlIssues(db, teamId, "IN_PROGRESS" as never),
      countControlIssues(db, teamId, "DONE" as never),
      countControlIssues(db, teamId, "CANCELLED" as never),
      countControlIssues(db, teamId),
    ]
  );

  return { backlog, todo, inProgress, done, cancelled, total };
}

async function getMonthlyCostMetrics(db: Database, teamId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const agg = await aggregateControlCosts(db, teamId, {
    startDate: monthStart,
  });

  return {
    spendCents: agg._sum.costCents ?? 0,
    inputTokens: agg._sum.inputTokens ?? 0,
    outputTokens: agg._sum.outputTokens ?? 0,
    eventCount: agg._count,
  };
}

export async function getControlSidebarBadges(db: Database, teamId: string) {
  const [pendingApprovals, staleIssues, runningAgents] = await Promise.all([
    listControlApprovals(db, teamId, { status: "PENDING" as never, limit: 1 }),
    getStaleIssueCount(db, teamId),
    countControlAgents(db, teamId, "RUNNING" as never),
  ]);

  return {
    pendingApprovalCount: pendingApprovals.length > 0 ? 1 : 0,
    staleIssueCount: staleIssues,
    runningAgentCount: runningAgents,
  };
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

async function getStaleIssueCount(
  db: Database,
  teamId: string
): Promise<number> {
  const issues = await listControlIssues(db, teamId, {
    status: "IN_PROGRESS" as never,
    limit: 100,
  });

  const now = Date.now();
  return issues.filter((i) => now - i.updatedAt.getTime() > STALE_THRESHOLD_MS)
    .length;
}

export async function getControlRecentActivity(
  db: Database,
  teamId: string,
  limit = 20
) {
  return await listControlActivityLogs(db, teamId, { limit });
}
