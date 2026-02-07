import { z } from "zod";
import { StakesLevelSchema } from "../ai/tools";
import { ToolCategorySchema } from "../common/errors";

export const ExecutionPolicySchema = z.object({
  maxTokenBudget: z.number().int().min(0).default(0),
  maxDurationMs: z.number().int().min(0).default(0),
  maxToolCalls: z.number().int().min(0).default(0),
  maxConcurrentExecutions: z.number().int().min(1).default(10),
  allowedToolCategories: z.array(ToolCategorySchema).default([]),
  blockedToolCategories: z.array(ToolCategorySchema).default([]),
  requireApprovalForCategories: z.array(ToolCategorySchema).default([]),
  maxStakesLevel: StakesLevelSchema.default("high"),
});

export type ExecutionPolicy = z.infer<typeof ExecutionPolicySchema>;

export const PolicyViolationSchema = z.object({
  rule: z.string(),
  current: z.number(),
  limit: z.number(),
  message: z.string(),
});

export type PolicyViolation = z.infer<typeof PolicyViolationSchema>;

export const PolicyWarningSchema = z.object({
  rule: z.string(),
  current: z.number(),
  threshold: z.number(),
  message: z.string(),
});

export type PolicyWarning = z.infer<typeof PolicyWarningSchema>;

export const PolicyCheckResultSchema = z.object({
  allowed: z.boolean(),
  violations: z.array(PolicyViolationSchema),
  warnings: z.array(PolicyWarningSchema),
});

export type PolicyCheckResult = z.infer<typeof PolicyCheckResultSchema>;
