import { z } from "zod";
import { FinishReasonSchema, TokenUsageSchema } from "./completion";
import { ProviderIdSchema } from "./providers";

export const AgentTaskTypeSchema = z.enum([
  "research",
  "analysis",
  "action",
  "synthesis",
]);

export type AgentTaskType = z.infer<typeof AgentTaskTypeSchema>;

export const AgentConfigSchema = z.object({
  providerId: ProviderIdSchema.optional(),
  modelId: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxSteps: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AgentContextSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  conversationId: z.string().optional(),
  executionId: z.string().optional(),
  accessControl: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentContext = z.infer<typeof AgentContextSchema>;

export const ToolResultSchema = z.object({
  type: z.literal("tool-result"),
  toolCallId: z.string(),
  toolName: z.string(),
  output: z.unknown(),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

export const ToolCallInfoSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
});

export type ToolCallInfo = z.infer<typeof ToolCallInfoSchema>;

export const StepTypeSchema = z.enum(["initial", "tool-result", "continue"]);

export type StepType = z.infer<typeof StepTypeSchema>;

export const StepFinishEventSchema = z.object({
  stepType: StepTypeSchema,
  text: z.string(),
  toolCalls: z.array(ToolCallInfoSchema),
  toolResults: z.array(ToolResultSchema),
  usage: TokenUsageSchema,
  finishReason: FinishReasonSchema,
  isContinued: z.boolean(),
});

export type StepFinishEvent = z.infer<typeof StepFinishEventSchema>;

export const AgentResultSchema = z.object({
  text: z.string(),
  toolCalls: z.array(ToolCallInfoSchema),
  toolResults: z.array(ToolResultSchema),
  stepCount: z.number().int().nonnegative(),
  usage: TokenUsageSchema,
  finishReason: FinishReasonSchema,
  durationMs: z.number().nonnegative(),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;

export const AgentStreamEventTextSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
});

export const AgentStreamEventToolCallSchema = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
});

export const AgentStreamEventToolResultSchema = z.object({
  type: z.literal("tool-result"),
  toolCallId: z.string(),
  output: z.unknown(),
});

export const AgentStreamEventStepFinishSchema = z.object({
  type: z.literal("step-finish"),
  step: StepFinishEventSchema,
});

export const AgentStreamEventDoneSchema = z.object({
  type: z.literal("done"),
  result: AgentResultSchema,
});

export const AgentStreamEventSchema = z.discriminatedUnion("type", [
  AgentStreamEventTextSchema,
  AgentStreamEventToolCallSchema,
  AgentStreamEventToolResultSchema,
  AgentStreamEventStepFinishSchema,
  AgentStreamEventDoneSchema,
]);

export type AgentStreamEvent = z.infer<typeof AgentStreamEventSchema>;
