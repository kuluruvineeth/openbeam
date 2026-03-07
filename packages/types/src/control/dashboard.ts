import { z } from "zod";

export const ControlAgentStatusCountsSchema = z.object({
  active: z.number().int(),
  running: z.number().int(),
  paused: z.number().int(),
  error: z.number().int(),
  idle: z.number().int(),
  total: z.number().int(),
});

export type ControlAgentStatusCounts = z.infer<
  typeof ControlAgentStatusCountsSchema
>;

export const ControlIssueBreakdownSchema = z.object({
  open: z.number().int(),
  inProgress: z.number().int(),
  blocked: z.number().int(),
  done: z.number().int(),
  total: z.number().int(),
});

export type ControlIssueBreakdown = z.infer<typeof ControlIssueBreakdownSchema>;

export const ControlCostMetricsSchema = z.object({
  monthSpendCents: z.number().int(),
  monthBudgetCents: z.number().int(),
  monthUtilizationPercent: z.number(),
});

export type ControlCostMetrics = z.infer<typeof ControlCostMetricsSchema>;

export const ControlDashboardSummarySchema = z.object({
  teamId: z.string(),
  agents: ControlAgentStatusCountsSchema,
  issues: ControlIssueBreakdownSchema,
  costs: ControlCostMetricsSchema,
  pendingApprovals: z.number().int(),
  staleIssueCount: z.number().int(),
});

export type ControlDashboardSummary = z.infer<
  typeof ControlDashboardSummarySchema
>;

export const ControlSidebarBadgesSchema = z.object({
  agentsWithErrors: z.number().int(),
  pendingApprovals: z.number().int(),
  blockedIssues: z.number().int(),
  overBudget: z.boolean(),
});

export type ControlSidebarBadges = z.infer<typeof ControlSidebarBadgesSchema>;

export const ControlStaleIssueAlertSchema = z.object({
  issueId: z.string(),
  title: z.string(),
  identifier: z.string().nullable(),
  status: z.string(),
  assigneeAgentId: z.string().nullable(),
  staleSinceDays: z.number().int(),
});

export type ControlStaleIssueAlert = z.infer<
  typeof ControlStaleIssueAlertSchema
>;
