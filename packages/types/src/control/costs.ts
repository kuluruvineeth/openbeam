import { z } from "zod";

export const ControlCostEventSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  agentId: z.string(),
  issueId: z.string().nullable(),
  projectId: z.string().nullable(),
  goalId: z.string().nullable(),
  billingCode: z.string().nullable(),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  costCents: z.number().int(),
  occurredAt: z.date(),
  createdAt: z.date(),
});

export type ControlCostEvent = z.infer<typeof ControlCostEventSchema>;

export const ControlCostSummarySchema = z.object({
  teamId: z.string(),
  spendCents: z.number().int(),
  budgetCents: z.number().int(),
  utilizationPercent: z.number(),
});

export type ControlCostSummary = z.infer<typeof ControlCostSummarySchema>;

export const ControlCostByAgentSchema = z.object({
  agentId: z.string(),
  agentName: z.string().nullable(),
  agentStatus: z.string().nullable(),
  costCents: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  runCount: z.number().int(),
});

export type ControlCostByAgent = z.infer<typeof ControlCostByAgentSchema>;

export const ControlCostByProjectSchema = z.object({
  projectId: z.string(),
  projectName: z.string().nullable(),
  costCents: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
});

export type ControlCostByProject = z.infer<typeof ControlCostByProjectSchema>;

export const ControlBudgetSchema = z.object({
  teamId: z.string(),
  budgetMonthlyCents: z.number().int().nullable(),
  consumedMonthlyCents: z.number().int().nullable(),
});

export type ControlBudget = z.infer<typeof ControlBudgetSchema>;
