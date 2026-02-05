import { z } from "zod";

export const CreateAgentCanvasExecutionInputSchema = z.object({
  agentCanvasId: z.string(),
  versionNumber: z.number().int().positive(),
  input: z.unknown().optional(),
  trace: z.unknown(),
  triggeredById: z.string(),
  triggerSource: z.string().optional(),
  workflowId: z.string().optional(),
  runId: z.string().optional(),
  temporalStatus: z.string().optional(),
  historyEventCount: z.number().int().nonnegative().optional(),
  historySizeBytes: z.number().int().nonnegative().optional(),
  continueAsNewCount: z.number().int().nonnegative().optional(),
});

export type CreateAgentCanvasExecutionInput = z.infer<
  typeof CreateAgentCanvasExecutionInputSchema
>;

export const UpdateAgentCanvasExecutionInputSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "RUNNING",
      "WAITING_APPROVAL",
      "WAITING_INPUT",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "TIMED_OUT",
    ])
    .optional(),
  currentNodeId: z.string().nullable().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  trace: z.unknown().optional(),
  tokenUsage: z.unknown().optional(),
  latencyMs: z.number().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  workflowId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  temporalStatus: z.string().nullable().optional(),
  historyEventCount: z.number().int().nonnegative().nullable().optional(),
  historySizeBytes: z.number().int().nonnegative().nullable().optional(),
  continueAsNewCount: z.number().int().nonnegative().nullable().optional(),
});

export type UpdateAgentCanvasExecutionInput = z.infer<
  typeof UpdateAgentCanvasExecutionInputSchema
>;

export const AgentCanvasExecutionSchema = z.object({
  id: z.string(),
  agentCanvasId: z.string(),
  versionNumber: z.number().int().positive(),
  status: z.enum([
    "PENDING",
    "RUNNING",
    "WAITING_APPROVAL",
    "WAITING_INPUT",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "TIMED_OUT",
  ]),
  currentNodeId: z.string().nullable(),
  input: z.unknown().nullable(),
  output: z.unknown().nullable(),
  error: z.string().nullable(),
  trace: z.unknown(),
  tokenUsage: z.unknown().nullable(),
  latencyMs: z.number().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  triggeredById: z.string(),
  triggerSource: z.string().nullable(),
  workflowId: z.string().nullable(),
  runId: z.string().nullable(),
  temporalStatus: z.string().nullable(),
  historyEventCount: z.number().int().nonnegative().nullable(),
  historySizeBytes: z.number().int().nonnegative().nullable(),
  continueAsNewCount: z.number().int().nonnegative().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AgentCanvasExecution = z.infer<typeof AgentCanvasExecutionSchema>;
