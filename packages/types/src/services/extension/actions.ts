import { z } from "zod";

export const EXTENSION_ACTION_KINDS = [
  "read_dom",
  "extract",
  "navigate",
  "click",
  "fill",
  "select",
  "scroll",
  "wait",
] as const;

export const ExtensionActionKindSchema = z.enum(EXTENSION_ACTION_KINDS);
export type ExtensionActionKind = z.infer<typeof ExtensionActionKindSchema>;

export const ExtensionActionRiskSchema = z.enum(["low", "medium", "high"]);
export type ExtensionActionRisk = z.infer<typeof ExtensionActionRiskSchema>;

export const ExtensionActionSelectorStrategySchema = z.enum([
  "css",
  "text",
  "xpath",
  "aria",
]);
export type ExtensionActionSelectorStrategy = z.infer<
  typeof ExtensionActionSelectorStrategySchema
>;

export const ExtensionActionSelectorSchema = z.object({
  strategy: ExtensionActionSelectorStrategySchema,
  value: z.string().min(1),
});
export type ExtensionActionSelector = z.infer<
  typeof ExtensionActionSelectorSchema
>;

export const ExtensionActionProposalSchema = z.object({
  actionId: z.string().min(1),
  sessionId: z.string().min(1),
  toolName: z.string().min(1),
  kind: ExtensionActionKindSchema,
  summary: z.string().min(1),
  targetUrl: z.url().optional(),
  selector: ExtensionActionSelectorSchema.optional(),
  input: z.record(z.string(), z.unknown()).default({}),
  risk: ExtensionActionRiskSchema.default("low"),
  requiresApproval: z.boolean().default(true),
});
export type ExtensionActionProposal = z.infer<
  typeof ExtensionActionProposalSchema
>;

export const ExtensionActionStatusSchema = z.enum([
  "proposed",
  "approved",
  "rejected",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);
export type ExtensionActionStatus = z.infer<typeof ExtensionActionStatusSchema>;

export const ExtensionExecutionErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});
export type ExtensionExecutionError = z.infer<
  typeof ExtensionExecutionErrorSchema
>;

export const ExtensionActionExecutionSchema = z.object({
  executionId: z.string().min(1),
  actionId: z.string().min(1),
  status: ExtensionActionStatusSchema,
  startedAtMs: z.number().int().nonnegative(),
  completedAtMs: z.number().int().nonnegative().optional(),
  artifact: z.record(z.string(), z.unknown()).optional(),
  error: ExtensionExecutionErrorSchema.optional(),
});
export type ExtensionActionExecution = z.infer<
  typeof ExtensionActionExecutionSchema
>;
