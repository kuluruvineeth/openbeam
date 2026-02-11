import { z } from "zod";

export const MissionOrchestratorInputSchema = z.object({
  missionId: z.string(),
  teamId: z.string(),
  objective: z.string(),
  maxConcurrentRuns: z.number().int().positive().default(3),
  budgetCents: z.number().int().nonnegative().optional(),
  heartbeatIntervalMin: z.number().int().positive().default(15),
  checkpoint: z
    .object({
      dispatchedRuns: z.number().default(0),
      completedTasks: z.number().default(0),
      consumedCents: z.number().default(0),
      lastDispatchAt: z.number().optional(),
    })
    .optional(),
});

export type MissionOrchestratorInput = z.infer<
  typeof MissionOrchestratorInputSchema
>;

export const MissionOrchestratorOutputSchema = z.object({
  missionId: z.string(),
  dispatchedRuns: z.number(),
  completedTasks: z.number(),
  consumedCents: z.number(),
  status: z.enum(["completed", "cancelled", "paused", "budget_exceeded"]),
});

export type MissionOrchestratorOutput = z.infer<
  typeof MissionOrchestratorOutputSchema
>;

export const MissionAgentRunInputSchema = z.object({
  missionId: z.string(),
  teamId: z.string(),
  agentId: z.string(),
  taskId: z.string(),
  runId: z.string(),
  soulPrompt: z.string(),
  maxSteps: z.number().int().positive().default(20),
});

export type MissionAgentRunInput = z.infer<typeof MissionAgentRunInputSchema>;

export const MissionAgentRunOutputSchema = z.object({
  runId: z.string(),
  taskId: z.string(),
  agentId: z.string(),
  steps: z.number(),
  tokensUsed: z.number(),
  costCents: z.number(),
  artifacts: z.array(z.unknown()),
  status: z.enum(["completed", "failed", "cancelled", "budget_exceeded"]),
});

export type MissionAgentRunOutput = z.infer<typeof MissionAgentRunOutputSchema>;

export const MissionWakePayloadSchema = z.object({
  missionId: z.string(),
  reason: z.enum(["heartbeat", "task", "mention", "manual", "run_complete"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MissionWakePayload = z.infer<typeof MissionWakePayloadSchema>;

export const MissionCommandPayloadSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
  actorId: z.string(),
});

export type MissionCommandPayload = z.infer<typeof MissionCommandPayloadSchema>;

export const MissionRuntimeQueryResultSchema = z.object({
  status: z.enum(["idle", "dispatching", "paused", "cancelled", "completed"]),
  queueDepth: z.number(),
  runningAgents: z.number(),
  lastDispatchAt: z.number().optional(),
  budgetRemaining: z.number().optional(),
  dispatchedRuns: z.number(),
  completedTasks: z.number(),
});

export type MissionRuntimeQueryResult = z.infer<
  typeof MissionRuntimeQueryResultSchema
>;

export const MissionLinearRunInputSchema = z.object({
  missionId: z.string(),
  teamId: z.string(),
  runId: z.string(),
  taskIds: z.array(z.string()).min(1),
  agentId: z.string(),
});

export type MissionLinearRunInput = z.infer<typeof MissionLinearRunInputSchema>;

export const MissionLinearRunOutputSchema = z.object({
  runId: z.string(),
  completedTasks: z.number(),
  failedTasks: z.number(),
  status: z.enum(["completed", "failed", "cancelled"]),
});

export type MissionLinearRunOutput = z.infer<
  typeof MissionLinearRunOutputSchema
>;

export const LinearRunProgressSchema = z.object({
  completedTasks: z.number(),
  currentTaskIndex: z.number(),
  totalTasks: z.number(),
  status: z.enum(["running", "cancelled"]),
});

export type LinearRunProgress = z.infer<typeof LinearRunProgressSchema>;
