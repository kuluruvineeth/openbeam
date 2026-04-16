import { z } from "zod";

export const ComputerRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "WAITING_APPROVAL",
]);
export type ComputerRunStatus = z.infer<typeof ComputerRunStatusSchema>;

export const ComputerTriggerTypeSchema = z.enum([
  "SCHEDULE",
  "MANUAL",
  "WEBHOOK",
  "API",
]);
export type ComputerTriggerType = z.infer<typeof ComputerTriggerTypeSchema>;

export const ProposedActionSchema = z.object({
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
  description: z.string().optional(),
});
export type ProposedAction = z.infer<typeof ProposedActionSchema>;

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().default(0),
  outputTokens: z.number().int().default(0),
  totalTokens: z.number().int().default(0),
  estimatedCost: z.number().default(0),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const TriggerRunInputSchema = z.object({
  agentId: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional(),
});
export type TriggerRunInput = z.infer<typeof TriggerRunInputSchema>;

export const ApproveRunInputSchema = z.object({
  approvedIndices: z.array(z.number().int().min(0)).optional(),
});
export type ApproveRunInput = z.infer<typeof ApproveRunInputSchema>;
