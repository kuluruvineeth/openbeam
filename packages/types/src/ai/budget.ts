import { z } from "zod";

export const BudgetTierSchema = z.enum([
  "full",
  "economy",
  "critical",
  "stopped",
]);

export type BudgetTier = z.infer<typeof BudgetTierSchema>;

export const BudgetTierConfigSchema = z.object({
  tier: BudgetTierSchema,
  modelOverride: z.string().optional(),
  maxToolCalls: z.number().optional(),
  searchLimit: z.number().optional(),
  skipExpensiveTools: z.array(z.string()).optional(),
  escalationRequired: z.boolean().default(false),
});

export type BudgetTierConfig = z.infer<typeof BudgetTierConfigSchema>;

export const BudgetThresholdsSchema = z.object({
  economyAt: z.number().default(0.6),
  criticalAt: z.number().default(0.85),
  stopAt: z.number().default(0.95),
});

export type BudgetThresholds = z.infer<typeof BudgetThresholdsSchema>;

export const BudgetTierTransitionSchema = z.object({
  tier: BudgetTierSchema,
  at: z.number(),
  consumedCents: z.number(),
});

export type BudgetTierTransition = z.infer<typeof BudgetTierTransitionSchema>;

export const BudgetStateSchema = z.object({
  budgetCents: z.number(),
  consumedCents: z.number(),
  currentTier: BudgetTierSchema,
  thresholds: BudgetThresholdsSchema,
  tierHistory: z.array(BudgetTierTransitionSchema),
});

export type BudgetState = z.infer<typeof BudgetStateSchema>;
