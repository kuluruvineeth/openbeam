import { z } from "zod";
import { ExecutionStatusSchema } from "./execution";
import { CanvasOperationSchema } from "./operations";

export const ChatUserMessagePayloadSchema = z.object({
  type: z.literal("chat.user_message"),
  content: z.string(),
});

export const ChatAssistantDeltaPayloadSchema = z.object({
  type: z.literal("chat.assistant_delta"),
  chunk: z.string(),
});

export const ChatAssistantFinalPayloadSchema = z.object({
  type: z.literal("chat.assistant_final"),
  content: z.string(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
});

export const ChatThinkingPayloadSchema = z.object({
  type: z.literal("chat.thinking"),
  content: z.string(),
});

export const ToolCallStartPayloadSchema = z.object({
  type: z.literal("tool.call_start"),
  toolCallId: z.string(),
  toolName: z.string(),
  displayName: z.string().optional(),
  toolInput: z.unknown().optional(),
  redacted: z.boolean().optional(),
  redactionKeys: z.array(z.string()).optional(),
});

export const ToolCallResultPayloadSchema = z.object({
  type: z.literal("tool.call_result"),
  toolCallId: z.string(),
  toolName: z.string(),
  toolOutput: z.unknown().optional(),
  durationMs: z.number().optional(),
  success: z.boolean(),
  redacted: z.boolean().optional(),
  redactionKeys: z.array(z.string()).optional(),
});

export const CanvasOpAppliedPayloadSchema = z.object({
  type: z.literal("canvas.op_applied"),
  operation: CanvasOperationSchema,
});

export const CanvasOpRejectedPayloadSchema = z.object({
  type: z.literal("canvas.op_rejected"),
  operation: CanvasOperationSchema,
  reason: z.string(),
});

export const CanvasSnapshotPayloadSchema = z.object({
  type: z.literal("canvas.snapshot"),
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
});

export const ExecutionStartedPayloadSchema = z.object({
  type: z.literal("execution.started"),
  executionId: z.string(),
  status: ExecutionStatusSchema,
});

export const ExecutionProgressPayloadSchema = z.object({
  type: z.literal("execution.progress"),
  executionId: z.string(),
  nodeId: z.string().optional(),
  progress: z.number().min(0).max(1).optional(),
  message: z.string().optional(),
});

export const ExecutionCompletedPayloadSchema = z.object({
  type: z.literal("execution.completed"),
  executionId: z.string(),
  status: ExecutionStatusSchema,
  durationMs: z.number().optional(),
});

export const ExecutionFailedPayloadSchema = z.object({
  type: z.literal("execution.failed"),
  executionId: z.string(),
  error: z.string(),
  retryable: z.boolean().optional(),
});

export const SessionStartedPayloadSchema = z.object({
  type: z.literal("session.started"),
  sessionId: z.string(),
});

export const SessionResumedPayloadSchema = z.object({
  type: z.literal("session.resumed"),
  sessionId: z.string(),
  lastSequence: z.number(),
});

export const RuntimeEventPayloadSchema = z.discriminatedUnion("type", [
  ChatUserMessagePayloadSchema,
  ChatAssistantDeltaPayloadSchema,
  ChatAssistantFinalPayloadSchema,
  ChatThinkingPayloadSchema,
  ToolCallStartPayloadSchema,
  ToolCallResultPayloadSchema,
  CanvasOpAppliedPayloadSchema,
  CanvasOpRejectedPayloadSchema,
  CanvasSnapshotPayloadSchema,
  ExecutionStartedPayloadSchema,
  ExecutionProgressPayloadSchema,
  ExecutionCompletedPayloadSchema,
  ExecutionFailedPayloadSchema,
  SessionStartedPayloadSchema,
  SessionResumedPayloadSchema,
]);

export type RuntimeEventPayload = z.infer<typeof RuntimeEventPayloadSchema>;

export const RuntimeEventSourceSchema = z.enum([
  "user",
  "agent",
  "system",
  "tool",
]);

export type RuntimeEventSource = z.infer<typeof RuntimeEventSourceSchema>;

export const RuntimeEventVisibilitySchema = z.enum([
  "visible",
  "ephemeral",
  "hidden",
]);

export type RuntimeEventVisibility = z.infer<
  typeof RuntimeEventVisibilitySchema
>;

export const RuntimeEventSchema = z.object({
  eventId: z.string(),
  sequence: z.number().int().nonnegative(),
  timestamp: z.number(),
  workspaceId: z.string().optional(),
  canvasId: z.string(),
  sessionId: z.string(),
  turnId: z.string().optional(),
  executionId: z.string().optional(),
  stepId: z.string().optional(),
  toolCallId: z.string().optional(),
  source: RuntimeEventSourceSchema,
  visibility: RuntimeEventVisibilitySchema,
  payload: RuntimeEventPayloadSchema,
});

export type RuntimeEvent = z.infer<typeof RuntimeEventSchema>;

export const RUNTIME_EVENT_TYPES = [
  "chat.user_message",
  "chat.assistant_delta",
  "chat.assistant_final",
  "chat.thinking",
  "tool.call_start",
  "tool.call_result",
  "canvas.op_applied",
  "canvas.op_rejected",
  "canvas.snapshot",
  "execution.started",
  "execution.progress",
  "execution.completed",
  "execution.failed",
  "session.started",
  "session.resumed",
] as const;

export type RuntimeEventType = (typeof RUNTIME_EVENT_TYPES)[number];
