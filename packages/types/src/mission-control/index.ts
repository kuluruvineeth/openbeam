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

export const TimeoutTierSchema = z.enum([
  "quick",
  "standard",
  "extended",
  "marathon",
]);

export const ChunkProgressSchema = z.object({
  current: z.number(),
  total: z.number(),
});

export const CrossMissionLinkSchema = z.object({
  missionId: z.string(),
  missionName: z.string(),
  type: z.enum(["shared", "knowledge"]),
});

export const MessageCountSchema = z.object({
  sent: z.number(),
  received: z.number(),
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
  timeoutTier: TimeoutTierSchema.optional(),
  chunkProgress: ChunkProgressSchema.nullable().optional(),
  reflectionScore: z.number().nullable().optional(),
  replanCount: z.number().optional().default(0),
  isReflecting: z.boolean().optional().default(false),
  stuckReason: z.string().nullable().optional(),
  spawnedBy: z.string().nullable().optional(),
  spawnDepth: z.number().optional().default(0),
  messageCount: MessageCountSchema.optional(),
  crossMissionLinks: z.array(CrossMissionLinkSchema).optional().default([]),
  sandboxSessionId: z.string().optional(),
  sandboxExecutionCount: z.number().optional(),
});

export const AgentMessageItemSchema = z.object({
  messageId: z.string(),
  missionId: z.string(),
  fromAgentId: z.string(),
  fromAgentName: z.string(),
  toAgentId: z.string().nullable(),
  toAgentName: z.string().nullable(),
  channel: z.enum(["direct", "broadcast", "cross_mission"]),
  contentPreview: z.string(),
  fullContent: z.string().optional(),
  replyToMessageId: z.string().nullable().optional(),
  sourceMissionId: z.string().optional(),
  sourceMissionName: z.string().optional(),
  timestamp: z.number(),
});

export const ReflectionHistoryEntrySchema = z.object({
  entryId: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  stepNumber: z.number(),
  score: z.number(),
  verbalMemory: z.string(),
  timestamp: z.number(),
  triggeredReplan: z.boolean().optional().default(false),
});

export const AgentHealthStatusSchema = z.enum([
  "progressing",
  "slow",
  "stuck",
  "escalated",
  "completed",
  "failed",
]);

export const AgentHealthRowSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  progressScore: z.number().nullable(),
  replanCount: z.number(),
  healthStatus: AgentHealthStatusSchema,
  recentScores: z.array(z.number()),
  stuckReason: z.string().nullable(),
  escalationReason: z.string().nullable(),
});

export const FailurePatternSchema = z.object({
  pattern: z.string(),
  frequency: z.number(),
  affectedAgents: z.array(z.string()),
});

export const AgentHealthSummarySchema = z.object({
  missionId: z.string(),
  totalAgents: z.number(),
  progressingCount: z.number(),
  stuckCount: z.number(),
  escalatedCount: z.number(),
  agents: z.array(AgentHealthRowSchema),
  failurePatterns: z.array(FailurePatternSchema),
  computedAt: z.number(),
});

export const CrossMissionLinkItemSchema = z.object({
  linkId: z.string(),
  sourceMissionId: z.string(),
  sourceMissionName: z.string(),
  targetMissionId: z.string(),
  targetMissionName: z.string(),
  linkType: z.enum(["shared", "knowledge"]),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  knowledgeKey: z.string().optional(),
  timestamp: z.number(),
});

export const SpawnProvenanceRecordSchema = z.object({
  childAgentId: z.string(),
  childAgentName: z.string(),
  parentAgentId: z.string(),
  parentAgentName: z.string(),
  spawnDepth: z.number(),
  spawnReason: z.string().optional(),
  timestamp: z.number(),
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
      capabilities: z.array(z.string()).optional(),
    })
  ),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(["P0", "P1", "P2", "P3"]),
      dependsOn: z.array(z.string()).optional(),
      requiredCapabilities: z.array(z.string()).optional(),
    })
  ),
  defaultObjective: z.string().optional(),
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
export type TimeoutTier = z.infer<typeof TimeoutTierSchema>;
export type ChunkProgress = z.infer<typeof ChunkProgressSchema>;
export type CrossMissionLink = z.infer<typeof CrossMissionLinkSchema>;
export type MessageCount = z.infer<typeof MessageCountSchema>;
export type AgentMessageItem = z.infer<typeof AgentMessageItemSchema>;
export type ReflectionHistoryEntry = z.infer<
  typeof ReflectionHistoryEntrySchema
>;
export type AgentHealthStatus = z.infer<typeof AgentHealthStatusSchema>;
export type AgentHealthRow = z.infer<typeof AgentHealthRowSchema>;
export type FailurePattern = z.infer<typeof FailurePatternSchema>;
export type AgentHealthSummary = z.infer<typeof AgentHealthSummarySchema>;
export type CrossMissionLinkItem = z.infer<typeof CrossMissionLinkItemSchema>;
export type SpawnProvenanceRecord = z.infer<typeof SpawnProvenanceRecordSchema>;
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
