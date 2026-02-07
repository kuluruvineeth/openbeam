import { z } from "zod";

export const EVAL_DIMENSION_WEIGHTS = {
  completion: 0.3,
  efficiency: 0.2,
  errorRate: 0.3,
  latency: 0.1,
  approvalOverhead: 0.1,
} as const;

export const EvalDimensionScoresSchema = z.object({
  completion: z.number().min(0).max(100),
  efficiency: z.number().min(0).max(100),
  errorRate: z.number().min(0).max(100),
  latency: z.number().min(0).max(100),
  approvalOverhead: z.number().min(0).max(100),
});

export type EvalDimensionScores = z.infer<typeof EvalDimensionScoresSchema>;

export const EvalFlagSchema = z.enum([
  "budget_exceeded",
  "approval_timeout",
  "loop_max_hit",
  "high_error_rate",
  "slow_execution",
  "no_steps",
]);

export type EvalFlag = z.infer<typeof EvalFlagSchema>;

export const ExecutionEvalResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  dimensions: EvalDimensionScoresSchema,
  flags: z.array(EvalFlagSchema),
  evaluatedAt: z.number(),
});

export type ExecutionEvalResult = z.infer<typeof ExecutionEvalResultSchema>;
