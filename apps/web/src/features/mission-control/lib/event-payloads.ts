import { z } from "zod";

const AgentPayloadSchema = z.object({
  agentId: z.string(),
});

const RunStartedPayloadSchema = AgentPayloadSchema.extend({
  model: z.string().optional(),
});

const RunCompletedPayloadSchema = AgentPayloadSchema;

const RunFailedPayloadSchema = AgentPayloadSchema.extend({
  errorMessage: z.string().optional(),
  error: z.string().optional(),
});

const ToolStartedPayloadSchema = AgentPayloadSchema.extend({
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
});

const ToolCompletedPayloadSchema = AgentPayloadSchema.extend({
  toolCallId: z.string().optional(),
  tokensUsed: z.number().optional(),
});

const ToolFailedPayloadSchema = AgentPayloadSchema.extend({
  toolCallId: z.string().optional(),
  errorMessage: z.string().optional(),
});

const TaskClaimedPayloadSchema = AgentPayloadSchema.extend({
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
});

const TaskCompletedPayloadSchema = AgentPayloadSchema;

const ApprovalAgentPayloadSchema = z.object({
  agentId: z.string().optional(),
});

const ApprovalRequestedPayloadSchema = ApprovalAgentPayloadSchema.extend({
  approvalId: z.string(),
  intent: z.string().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  toolName: z.string().optional(),
  toolParams: z.record(z.string(), z.unknown()).optional(),
  riskFactors: z.array(z.string()).optional(),
  expiresAt: z.number().optional(),
});

const ApprovalResolvedPayloadSchema = z.object({
  approvalId: z.string(),
  approved: z.boolean().optional(),
  resolvedById: z.string().optional(),
  reason: z.string().optional(),
});

const CostUpdatedPayloadSchema = z.object({
  agentId: z.string().optional(),
  costCents: z.number().optional(),
  consumedCents: z.number().optional(),
  burnRateCentsPerMinute: z.number().optional(),
});

const BudgetSetPayloadSchema = z.object({
  budgetCents: z.number().optional(),
});

const PAYLOAD_SCHEMAS = {
  "run.started": RunStartedPayloadSchema,
  "run.completed": RunCompletedPayloadSchema,
  "run.failed": RunFailedPayloadSchema,
  "tool.started": ToolStartedPayloadSchema,
  "tool.completed": ToolCompletedPayloadSchema,
  "tool.failed": ToolFailedPayloadSchema,
  "task.claimed": TaskClaimedPayloadSchema,
  "task.completed": TaskCompletedPayloadSchema,
  "approval.requested": ApprovalRequestedPayloadSchema,
  "approval.resolved": ApprovalResolvedPayloadSchema,
  "cost.updated": CostUpdatedPayloadSchema,
  "budget.set": BudgetSetPayloadSchema,
} as const;

type PayloadSchemas = typeof PAYLOAD_SCHEMAS;

export type EventType = keyof PayloadSchemas;

export type EventPayload<T extends EventType> = z.infer<PayloadSchemas[T]>;

export function parseEventPayload<T extends EventType>(
  eventType: T,
  payload: unknown
): EventPayload<T> | null {
  const schema = PAYLOAD_SCHEMAS[eventType] as z.ZodSchema | undefined;
  if (!schema) {
    return null;
  }
  const result = schema.safeParse(payload);
  return result.success ? (result.data as EventPayload<T>) : null;
}

export function isKnownEventType(eventType: string): eventType is EventType {
  return eventType in PAYLOAD_SCHEMAS;
}

export type RunStartedPayload = z.infer<typeof RunStartedPayloadSchema>;
export type RunCompletedPayload = z.infer<typeof RunCompletedPayloadSchema>;
export type RunFailedPayload = z.infer<typeof RunFailedPayloadSchema>;
export type ToolStartedPayload = z.infer<typeof ToolStartedPayloadSchema>;
export type ToolCompletedPayload = z.infer<typeof ToolCompletedPayloadSchema>;
export type ToolFailedPayload = z.infer<typeof ToolFailedPayloadSchema>;
export type TaskClaimedPayload = z.infer<typeof TaskClaimedPayloadSchema>;
export type TaskCompletedPayload = z.infer<typeof TaskCompletedPayloadSchema>;
export type ApprovalRequestedPayload = z.infer<
  typeof ApprovalRequestedPayloadSchema
>;
export type ApprovalResolvedPayload = z.infer<
  typeof ApprovalResolvedPayloadSchema
>;
export type CostUpdatedPayload = z.infer<typeof CostUpdatedPayloadSchema>;
export type BudgetSetPayload = z.infer<typeof BudgetSetPayloadSchema>;
