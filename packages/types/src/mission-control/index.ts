import { z } from "zod";

export const MissionExecutionLaneSchema = z.enum([
  "linear",
  "autonomous",
  "hybrid",
]);

export const MissionRunVisibilitySchema = z.enum(["private", "team", "public"]);

export const MissionActionDecisionSchema = z.enum([
  "auto",
  "require_approval",
  "block",
]);

export const MissionRunTableRowSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  status: z.string(),
  lane: MissionExecutionLaneSchema,
  agentCount: z.number(),
  taskCount: z.number(),
  completedTasks: z.number(),
  costCents: z.number(),
  startedAt: z.number().optional(),
  updatedAt: z.number(),
});

export const ToolCallSummarySchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  startedAt: z.number(),
  durationMs: z.number().optional(),
});

export const MissionAgentLaneStateSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  role: z.string(),
  status: z.enum(["idle", "running", "blocked", "completed", "failed"]),
  currentTaskId: z.string().optional(),
  currentTaskTitle: z.string().optional(),
  stepsCompleted: z.number(),
  tokensUsed: z.number(),
  costCents: z.number(),
  lastActivityAt: z.number().optional(),
  totalSteps: z.number().optional(),
  model: z.string().optional(),
  recentToolCalls: z.array(ToolCallSummarySchema).default([]),
  errorMessage: z.string().optional(),
});

export const MissionEventLedgerItemSchema = z.object({
  eventId: z.string(),
  missionId: z.string(),
  runId: z.string(),
  lane: MissionExecutionLaneSchema,
  sequence: z.number(),
  eventType: z.string(),
  summary: z.string(),
  agentName: z.string().optional(),
  timestamp: z.number(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const MissionApprovalQueueItemSchema = z.object({
  approvalId: z.string(),
  missionId: z.string(),
  runId: z.string(),
  agentName: z.string(),
  actionIntent: z.string(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["pending", "approved", "rejected", "escalated"]),
  requestedAt: z.number(),
  resolvedAt: z.number().optional(),
  resolvedById: z.string().optional(),
  reason: z.string().optional(),
  agentId: z.string().optional(),
  toolName: z.string().optional(),
  toolParams: z.record(z.string(), z.unknown()).optional(),
  affectedResources: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()).optional(),
  expiresAt: z.number().optional(),
});

export const MissionArtifactItemSchema = z.object({
  artifactId: z.string(),
  missionId: z.string(),
  runId: z.string(),
  agentName: z.string(),
  title: z.string(),
  type: z.enum(["document", "report", "code", "data", "image", "other"]),
  content: z.unknown().optional(),
  url: z.string().optional(),
  version: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const MissionTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  vertical: z.string(),
  agents: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      soulPrompt: z.string(),
      tools: z.array(z.string()),
    })
  ),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(["P0", "P1", "P2", "P3"]),
    })
  ),
  complianceProfile: z.string().optional(),
});

export const MissionEventPayloadSchema = z.object({
  missionId: z.string(),
  runId: z.string(),
  lane: MissionExecutionLaneSchema,
  sequence: z.number(),
  eventType: z.string(),
  timestamp: z.number(),
  payload: z.record(z.string(), z.unknown()),
});

export const CreateMissionFromPromptSchema = z.object({
  teamId: z.string(),
  objective: z.string().min(1),
  templateId: z.string().optional(),
  lane: MissionExecutionLaneSchema.optional().default("autonomous"),
  budgetCents: z.number().optional(),
  maxConcurrentRuns: z.number().min(1).max(10).optional().default(3),
});

export const StartMissionRunSchema = z.object({
  missionId: z.string(),
  lane: MissionExecutionLaneSchema.optional(),
});

export type MissionExecutionLane = z.infer<typeof MissionExecutionLaneSchema>;
export type MissionRunVisibility = z.infer<typeof MissionRunVisibilitySchema>;
export type MissionActionDecision = z.infer<typeof MissionActionDecisionSchema>;
export type MissionRunTableRow = z.infer<typeof MissionRunTableRowSchema>;
export type MissionAgentLaneState = z.infer<typeof MissionAgentLaneStateSchema>;
export type ToolCallSummary = z.infer<typeof ToolCallSummarySchema>;
export type MissionEventLedgerItem = z.infer<
  typeof MissionEventLedgerItemSchema
>;
export type MissionApprovalQueueItem = z.infer<
  typeof MissionApprovalQueueItemSchema
>;
export type MissionArtifactItem = z.infer<typeof MissionArtifactItemSchema>;
export type MissionTemplate = z.infer<typeof MissionTemplateSchema>;
export type MissionEventPayload = z.infer<typeof MissionEventPayloadSchema>;
export type CreateMissionFromPrompt = z.infer<
  typeof CreateMissionFromPromptSchema
>;
export type StartMissionRun = z.infer<typeof StartMissionRunSchema>;
