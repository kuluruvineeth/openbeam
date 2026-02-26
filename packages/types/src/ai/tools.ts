import { z } from "zod";
import { ErrorCodeSchema, ToolCategorySchema } from "../common/errors";

export const ToolErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  suggestion: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ToolError = z.infer<typeof ToolErrorSchema>;

export const AllowedCallerSchema = z.enum([
  "agent",
  "code_execution",
  "mcp",
  "api",
]);

export type AllowedCaller = z.infer<typeof AllowedCallerSchema>;

export const PermissionModeSchema = z.enum([
  "default",
  "readOnly",
  "elevated",
  "plan",
]);

export type PermissionMode = z.infer<typeof PermissionModeSchema>;

export const PermissionModeConfigSchema = z.object({
  allowedCategories: z.array(ToolCategorySchema),
  allowedTools: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
  requiresApproval: z.boolean().optional(),
  canWrite: z.boolean(),
  canExecute: z.boolean(),
  canAccessExternal: z.boolean(),
});

export type PermissionModeConfig = z.infer<typeof PermissionModeConfigSchema>;

export const WebPermissionConfigSchema = z.object({
  mode: PermissionModeSchema,
  userId: z.string(),
  teamId: z.string(),
  customAllowedTools: z.array(z.string()).optional(),
  customDeniedTools: z.array(z.string()).optional(),
});

export type WebPermissionConfig = z.infer<typeof WebPermissionConfigSchema>;

export const ToolBudgetContextSchema = z.object({
  budgetTier: z.enum(["full", "economy", "critical", "stopped"]).optional(),
  budgetRemainingCents: z.number().optional(),
  budgetTotalCents: z.number().optional(),
});

export type ToolBudgetContext = z.infer<typeof ToolBudgetContextSchema>;

export const ToolContextSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  accessControl: z.array(z.string()).optional(),
  conversationId: z.string().optional(),
  sessionId: z.string().optional(),
  executionId: z.string().optional(),
  correlationId: z.string().optional(),
  parentSpanId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  budget: ToolBudgetContextSchema.optional(),
});

export type ToolContextBase = z.infer<typeof ToolContextSchema>;

export const ToolResultMetadataSchema = z.object({
  latencyMs: z.number().nonnegative(),
  tokenCount: z.number().int().nonnegative().optional(),
  source: z.string().optional(),
  cached: z.boolean().optional(),
  cost: z
    .object({
      amount: z.string(),
      currency: z.string(),
      txHash: z.string().optional(),
    })
    .optional(),
});

export type ToolResultMetadata = z.infer<typeof ToolResultMetadataSchema>;

export const ToolExecutionResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: ToolErrorSchema.optional(),
  metadata: ToolResultMetadataSchema.optional(),
});

export type ToolExecutionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: ToolError;
  metadata?: ToolResultMetadata;
};

export const StakesLevelSchema = z.enum(["low", "medium", "high"]);

export type StakesLevel = z.infer<typeof StakesLevelSchema>;

export const ReversibilityLevelSchema = z.enum([
  "easy",
  "hard",
  "irreversible",
]);

export type ReversibilityLevel = z.infer<typeof ReversibilityLevelSchema>;

export const ApprovalPatternSchema = z.enum([
  "auto",
  "quick-confirm",
  "suggest-apply",
  "explicit",
]);

export type ApprovalPattern = z.infer<typeof ApprovalPatternSchema>;

export const ToolRiskProfileSchema = z.object({
  stakes: StakesLevelSchema,
  reversibility: ReversibilityLevelSchema,
  approval: ApprovalPatternSchema,
});

export type ToolRiskProfile = z.infer<typeof ToolRiskProfileSchema>;

export const ToolPricingSchema = z.object({
  amount: z.string(),
  currency: z.string().default("USDC"),
  network: z.string().default("eip155:84532"),
  description: z.string().optional(),
});

export type ToolPricing = z.infer<typeof ToolPricingSchema>;

export const ToolMetadataSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: ToolCategorySchema,
  deferLoading: z.boolean().optional(),
  searchKeywords: z.array(z.string()).optional(),
  requiredPermissions: z.array(z.string()).optional(),
  allowedCallers: z.array(AllowedCallerSchema).optional(),
  cacheTtlMs: z.number().int().positive().optional(),
  riskProfile: ToolRiskProfileSchema.optional(),
  pricing: ToolPricingSchema.optional(),
});

export type ToolMetadata = z.infer<typeof ToolMetadataSchema>;

export const ToolMaskSchema = z.object({
  loaded: z.array(z.string()).optional(),
  disabled: z.array(z.string()).optional(),
});

export type ToolMask = z.infer<typeof ToolMaskSchema>;
