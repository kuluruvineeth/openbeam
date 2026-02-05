import { z } from "zod";
import { ExecutionStatusSchema } from "./execution";

export const ExecutionEventTypeSchema = z.enum([
  "execution.started",
  "execution.progress",
  "execution.completed",
  "execution.failed",
  "execution.cancelled",
  "step.started",
  "step.progress",
  "step.completed",
  "step.failed",
  "step.skipped",
  "step.retrying",
  "approval.requested",
  "approval.received",
  "input.requested",
  "input.received",
  "heartbeat",
  "connected",
  "disconnected",
]);

export type ExecutionEventType = z.infer<typeof ExecutionEventTypeSchema>;

export const ExecutionStartedEventSchema = z.object({
  type: z.literal("execution.started"),
  executionId: z.string(),
  agentCanvasId: z.string(),
  timestamp: z.number(),
});

export type ExecutionStartedEvent = z.infer<typeof ExecutionStartedEventSchema>;

export const ExecutionProgressEventSchema = z.object({
  type: z.literal("execution.progress"),
  executionId: z.string(),
  currentNodeId: z.string().optional(),
  stepsCompleted: z.number(),
  stepsTotal: z.number(),
  timestamp: z.number(),
});

export type ExecutionProgressEvent = z.infer<
  typeof ExecutionProgressEventSchema
>;

export const ExecutionCompletedEventSchema = z.object({
  type: z.literal("execution.completed"),
  executionId: z.string(),
  status: ExecutionStatusSchema,
  output: z.unknown().optional(),
  durationMs: z.number(),
  timestamp: z.number(),
});

export type ExecutionCompletedEvent = z.infer<
  typeof ExecutionCompletedEventSchema
>;

export const ExecutionFailedEventSchema = z.object({
  type: z.literal("execution.failed"),
  executionId: z.string(),
  error: z.string(),
  failedNodeId: z.string().optional(),
  timestamp: z.number(),
});

export type ExecutionFailedEvent = z.infer<typeof ExecutionFailedEventSchema>;

export const StepStartedEventSchema = z.object({
  type: z.literal("step.started"),
  executionId: z.string(),
  stepId: z.string(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeName: z.string(),
  attempt: z.number().default(1),
  timestamp: z.number(),
});

export type StepStartedEvent = z.infer<typeof StepStartedEventSchema>;

export const StepProgressEventSchema = z.object({
  type: z.literal("step.progress"),
  executionId: z.string(),
  stepId: z.string(),
  nodeId: z.string(),
  progress: z.number(),
  message: z.string().optional(),
  timestamp: z.number(),
});

export type StepProgressEvent = z.infer<typeof StepProgressEventSchema>;

export const StepCompletedEventSchema = z.object({
  type: z.literal("step.completed"),
  executionId: z.string(),
  stepId: z.string(),
  nodeId: z.string(),
  output: z.unknown().optional(),
  durationMs: z.number(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
  timestamp: z.number(),
});

export type StepCompletedEvent = z.infer<typeof StepCompletedEventSchema>;

export const StepFailedEventSchema = z.object({
  type: z.literal("step.failed"),
  executionId: z.string(),
  stepId: z.string(),
  nodeId: z.string(),
  error: z.string(),
  stackTrace: z.string().optional(),
  isRetryable: z.boolean(),
  timestamp: z.number(),
});

export type StepFailedEvent = z.infer<typeof StepFailedEventSchema>;

export const StepRetryingEventSchema = z.object({
  type: z.literal("step.retrying"),
  executionId: z.string(),
  stepId: z.string(),
  nodeId: z.string(),
  attempt: z.number(),
  maxAttempts: z.number(),
  retryDelayMs: z.number(),
  reason: z.string().optional(),
  timestamp: z.number(),
});

export type StepRetryingEvent = z.infer<typeof StepRetryingEventSchema>;

export const ApprovalRequestedEventSchema = z.object({
  type: z.literal("approval.requested"),
  executionId: z.string(),
  approvalId: z.string(),
  nodeId: z.string(),
  message: z.string().optional(),
  expiresAt: z.string().optional(),
  timestamp: z.number(),
});

export type ApprovalRequestedEvent = z.infer<
  typeof ApprovalRequestedEventSchema
>;

export const ApprovalReceivedEventSchema = z.object({
  type: z.literal("approval.received"),
  executionId: z.string(),
  approvalId: z.string(),
  nodeId: z.string(),
  approved: z.boolean(),
  respondedById: z.string(),
  respondedByName: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.number(),
});

export type ApprovalReceivedEvent = z.infer<typeof ApprovalReceivedEventSchema>;

export const HeartbeatEventSchema = z.object({
  type: z.literal("heartbeat"),
  timestamp: z.number(),
});

export type HeartbeatEvent = z.infer<typeof HeartbeatEventSchema>;

export const StepSkippedEventSchema = z.object({
  type: z.literal("step.skipped"),
  executionId: z.string(),
  stepId: z.string(),
  nodeId: z.string(),
  reason: z.string().optional(),
  timestamp: z.number(),
});

export type StepSkippedEvent = z.infer<typeof StepSkippedEventSchema>;

export const ExecutionCancelledEventSchema = z.object({
  type: z.literal("execution.cancelled"),
  executionId: z.string(),
  cancelledById: z.string().optional(),
  reason: z.string().optional(),
  timestamp: z.number(),
});

export type ExecutionCancelledEvent = z.infer<
  typeof ExecutionCancelledEventSchema
>;

export const InputRequestedEventSchema = z.object({
  type: z.literal("input.requested"),
  executionId: z.string(),
  inputId: z.string(),
  nodeId: z.string(),
  prompt: z.string().optional(),
  schema: z.unknown().optional(),
  timestamp: z.number(),
});

export type InputRequestedEvent = z.infer<typeof InputRequestedEventSchema>;

export const InputReceivedEventSchema = z.object({
  type: z.literal("input.received"),
  executionId: z.string(),
  inputId: z.string(),
  nodeId: z.string(),
  providedById: z.string(),
  providedByName: z.string().optional(),
  timestamp: z.number(),
});

export type InputReceivedEvent = z.infer<typeof InputReceivedEventSchema>;

export const ConnectedEventSchema = z.object({
  type: z.literal("connected"),
  timestamp: z.number(),
});

export type ConnectedEvent = z.infer<typeof ConnectedEventSchema>;

export const DisconnectedEventSchema = z.object({
  type: z.literal("disconnected"),
  reason: z.string().optional(),
  timestamp: z.number(),
});

export type DisconnectedEvent = z.infer<typeof DisconnectedEventSchema>;

export const ExecutionEventSchema = z.discriminatedUnion("type", [
  ExecutionStartedEventSchema,
  ExecutionProgressEventSchema,
  ExecutionCompletedEventSchema,
  ExecutionFailedEventSchema,
  ExecutionCancelledEventSchema,
  StepStartedEventSchema,
  StepProgressEventSchema,
  StepCompletedEventSchema,
  StepFailedEventSchema,
  StepSkippedEventSchema,
  StepRetryingEventSchema,
  ApprovalRequestedEventSchema,
  ApprovalReceivedEventSchema,
  InputRequestedEventSchema,
  InputReceivedEventSchema,
  HeartbeatEventSchema,
  ConnectedEventSchema,
  DisconnectedEventSchema,
]);

export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;

export const ExecutionSubscriptionOptionsSchema = z.object({
  executionId: z.string(),
  includeStepDetails: z.boolean().default(true),
  includeOutput: z.boolean().default(false),
  reconnectOnDisconnect: z.boolean().default(true),
  maxReconnectAttempts: z.number().min(0).max(10).default(5),
  reconnectDelayMs: z.number().min(100).max(60_000).default(1000),
});

export type ExecutionSubscriptionOptions = z.infer<
  typeof ExecutionSubscriptionOptionsSchema
>;
