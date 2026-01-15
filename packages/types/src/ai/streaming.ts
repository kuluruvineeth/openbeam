import { z } from "zod";

export const AgentEventTypeSchema = z.enum([
  "thinking",
  "status",
  "tool_call",
  "tool_result",
  "text",
  "error",
  "done",
]);

export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentStatusSchema = z.enum([
  "idle",
  "analyzing",
  "searching",
  "retrieving",
  "synthesizing",
  "verifying",
  "waiting",
]);

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const ToolVisibilitySchema = z.enum(["visible", "ephemeral", "hidden"]);

export type ToolVisibility = z.infer<typeof ToolVisibilitySchema>;

export const AgentEventBaseSchema = z.object({
  type: AgentEventTypeSchema,
  timestamp: z.number(),
  agentName: z.string().optional(),
});

export type AgentEventBase = z.infer<typeof AgentEventBaseSchema>;

export const ThinkingEventSchema = z.object({
  type: z.literal("thinking"),
  timestamp: z.number(),
  agentName: z.string().optional(),
  message: z.string(),
});

export type ThinkingEvent = z.infer<typeof ThinkingEventSchema>;

export const StatusEventSchema = z.object({
  type: z.literal("status"),
  timestamp: z.number(),
  agentName: z.string().optional(),
  status: AgentStatusSchema,
  message: z.string(),
});

export type StatusEvent = z.infer<typeof StatusEventSchema>;

export const ToolCallEventSchema = z.object({
  type: z.literal("tool_call"),
  timestamp: z.number(),
  agentName: z.string().optional(),
  toolCallId: z.string(),
  toolName: z.string(),
  toolInput: z.unknown().optional(),
  displayName: z.string(),
  visibility: ToolVisibilitySchema,
});

export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>;

export const ToolResultEventSchema = z.object({
  type: z.literal("tool_result"),
  timestamp: z.number(),
  agentName: z.string().optional(),
  toolCallId: z.string(),
  toolName: z.string(),
  toolOutput: z.unknown().optional(),
  durationMs: z.number().optional(),
  success: z.boolean(),
  sourceCount: z.number().optional(),
});

export type ToolResultEvent = z.infer<typeof ToolResultEventSchema>;

export const TextEventSchema = z.object({
  type: z.literal("text"),
  timestamp: z.number(),
  agentName: z.string().optional(),
  content: z.string(),
  isPartial: z.boolean(),
});

export type TextEvent = z.infer<typeof TextEventSchema>;

export const ErrorEventSchema = z.object({
  type: z.literal("error"),
  timestamp: z.number(),
  agentName: z.string().optional(),
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

export const DoneEventSchema = z.object({
  type: z.literal("done"),
  timestamp: z.number(),
  agentName: z.string().optional(),
  success: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DoneEvent = z.infer<typeof DoneEventSchema>;

export const AgentEventSchema = z.discriminatedUnion("type", [
  ThinkingEventSchema,
  StatusEventSchema,
  ToolCallEventSchema,
  ToolResultEventSchema,
  TextEventSchema,
  ErrorEventSchema,
  DoneEventSchema,
]);

export type AgentEvent = z.infer<typeof AgentEventSchema>;
