import { z } from "zod";

export const CreateControlCostEventInputSchema = z.object({
  agentId: z.string().min(1),
  issueId: z.string().min(1).nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  goalId: z.string().min(1).nullable().optional(),
  billingCode: z.string().max(120).nullable().optional(),
  provider: z.string().min(1).max(120),
  model: z.string().min(1).max(120),
  inputTokens: z.number().int().nonnegative().optional().default(0),
  outputTokens: z.number().int().nonnegative().optional().default(0),
  costCents: z.number().int().nonnegative(),
  occurredAt: z.coerce.date(),
});

export type CreateControlCostEventInput = z.infer<
  typeof CreateControlCostEventInputSchema
>;

export const ControlCostQueryInputSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  agentId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  billingCode: z.string().min(1).optional(),
  limit: z.number().int().positive().optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type ControlCostQueryInput = z.infer<typeof ControlCostQueryInputSchema>;

export const UpdateControlBudgetInputSchema = z.object({
  budgetMonthlyCents: z.number().int().nonnegative(),
});

export type UpdateControlBudgetInput = z.infer<
  typeof UpdateControlBudgetInputSchema
>;
