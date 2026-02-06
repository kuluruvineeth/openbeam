import { z } from "zod";

export const CheckRateLimitInputSchema = z.object({
  key: z.string(),
  limit: z.number().int().positive(),
  windowMs: z.number().int().positive(),
});

export type CheckRateLimitInput = z.infer<typeof CheckRateLimitInputSchema>;

export const CheckRateLimitOutputSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int().nonnegative(),
  resetAt: z.number().int().nonnegative(),
  current: z.number().int().nonnegative(),
});

export type CheckRateLimitOutput = z.infer<typeof CheckRateLimitOutputSchema>;

export const WorkflowRateLimitConfigSchema = z.object({
  limitKey: z.string(),
  limit: z.number().int().positive().default(100),
  windowMs: z
    .number()
    .int()
    .positive()
    .default(60 * 60 * 1000),
});

export type WorkflowRateLimitConfig = z.infer<
  typeof WorkflowRateLimitConfigSchema
>;

export const DEFAULT_CANVAS_EXECUTION_RATE_LIMIT = {
  limitKey: "canvas-execution",
  limit: 100,
  windowMs: 60 * 60 * 1000,
} as const satisfies WorkflowRateLimitConfig;
