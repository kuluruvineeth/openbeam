import { z } from "zod";
import { CrossMissionSignalPayloadSchema } from "./cross-mission";
import { AgentMessageEnvelopeSchema } from "./mission-messaging";

export const SpawnAgentRequestSchema = z.object({
  requestingAgentId: z.string(),
  taskDescription: z.string().min(10).max(2000),
  requiredCapabilities: z.array(z.string()).min(1).max(20),
  suggestedTools: z.array(z.string()).max(15).optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
  maxSteps: z.number().int().min(1).max(50).default(10),
  budgetCentsLimit: z.number().int().min(1).max(500).default(50),
  dependsOnTaskId: z.string().optional(),
  context: z.string().max(4000).optional(),
  justification: z.string().max(500).optional(),
});

export type SpawnAgentRequest = z.infer<typeof SpawnAgentRequestSchema>;

export const SpawnValidationResultSchema = z.object({
  approved: z.boolean(),
  reason: z.string(),
  adjustedBudgetCents: z.number().int().optional(),
  adjustedMaxSteps: z.number().int().optional(),
  deniedCapabilities: z.array(z.string()).optional(),
});

export type SpawnValidationResult = z.infer<typeof SpawnValidationResultSchema>;

export const SpawnedAgentBlueprintSchema = z.object({
  name: z.string(),
  role: z.string(),
  soulPrompt: z.string(),
  tools: z.array(z.string()),
  capabilities: z.array(z.string()),
  maxSteps: z.number().int(),
  budgetCentsLimit: z.number().int(),
  parentAgentId: z.string(),
  spawnReason: z.string(),
});

export type SpawnedAgentBlueprint = z.infer<typeof SpawnedAgentBlueprintSchema>;

export const SpawnAgentSignalPayloadSchema = z.object({
  requestId: z.string(),
  request: SpawnAgentRequestSchema,
});

export type SpawnAgentSignalPayload = z.infer<
  typeof SpawnAgentSignalPayloadSchema
>;

export const SpawnLimitsSchema = z.object({
  maxSpawnedAgentsPerMission: z.number().int().min(1).default(10),
  maxSpawnedAgentsPerAgent: z.number().int().min(1).default(3),
  maxSpawnDepth: z.number().int().min(1).default(2),
  maxConcurrentSpawned: z.number().int().min(1).default(5),
  spawnBudgetPercentage: z.number().min(0).max(100).default(30),
  requireApprovalAboveDepth: z.number().int().min(1).optional(),
});

export type SpawnLimits = z.infer<typeof SpawnLimitsSchema>;

export const SwarmPresetIdSchema = z.enum([
  "small",
  "medium",
  "large",
  "swarm",
]);
export type SwarmPresetId = z.infer<typeof SwarmPresetIdSchema>;

export interface SwarmPreset {
  id: SwarmPresetId;
  label: string;
  description: string;
  maxConcurrentRuns: number;
  budgetCents: number;
  spawnLimits: SpawnLimits;
}

export const SWARM_PRESETS: Record<SwarmPresetId, SwarmPreset> = {
  small: {
    id: "small",
    label: "Small",
    description: "Up to 5 agents",
    maxConcurrentRuns: 3,
    budgetCents: 500,
    spawnLimits: {
      maxSpawnedAgentsPerMission: 5,
      maxSpawnedAgentsPerAgent: 2,
      maxSpawnDepth: 1,
      maxConcurrentSpawned: 3,
      spawnBudgetPercentage: 20,
    },
  },
  medium: {
    id: "medium",
    label: "Medium",
    description: "Up to 25 agents",
    maxConcurrentRuns: 5,
    budgetCents: 2500,
    spawnLimits: {
      maxSpawnedAgentsPerMission: 25,
      maxSpawnedAgentsPerAgent: 5,
      maxSpawnDepth: 3,
      maxConcurrentSpawned: 10,
      spawnBudgetPercentage: 30,
    },
  },
  large: {
    id: "large",
    label: "Large",
    description: "Up to 100 agents",
    maxConcurrentRuns: 10,
    budgetCents: 10_000,
    spawnLimits: {
      maxSpawnedAgentsPerMission: 100,
      maxSpawnedAgentsPerAgent: 10,
      maxSpawnDepth: 4,
      maxConcurrentSpawned: 25,
      spawnBudgetPercentage: 40,
    },
  },
  swarm: {
    id: "swarm",
    label: "Swarm",
    description: "Up to 500 agents",
    maxConcurrentRuns: 20,
    budgetCents: 50_000,
    spawnLimits: {
      maxSpawnedAgentsPerMission: 500,
      maxSpawnedAgentsPerAgent: 20,
      maxSpawnDepth: 5,
      maxConcurrentSpawned: 50,
      spawnBudgetPercentage: 50,
    },
  },
};

export const SHARD_THRESHOLD = 50;
export const HISTORY_EVENT_THRESHOLD = 30_000;

export const SubOrchestratorInputSchema = z.object({
  missionId: z.string(),
  teamId: z.string(),
  shardId: z.string(),
  parentWorkflowId: z.string(),
});

export type SubOrchestratorInput = z.infer<typeof SubOrchestratorInputSchema>;

export const SubOrchestratorOutputSchema = z.object({
  shardId: z.string(),
  processedAgents: z.number(),
  status: z.enum(["completed", "cancelled"]),
});

export type SubOrchestratorOutput = z.infer<typeof SubOrchestratorOutputSchema>;

export const ReviewPolicySchema = z.enum([
  "none",
  "auto",
  "peer",
  "peer_high_stakes",
  "consensus",
]);

export type ReviewPolicy = z.infer<typeof ReviewPolicySchema>;

export const ReviewGatingConfigSchema = z.object({
  policy: ReviewPolicySchema.default("none"),
  requiredReviewers: z.number().int().min(1).max(5).default(1),
  autoAssign: z.boolean().default(true),
  highStakesPriorities: z.array(z.enum(["P0", "P1"])).default(["P0"]),
  reviewTimeoutMin: z.number().int().positive().default(5),
});

export type ReviewGatingConfig = z.infer<typeof ReviewGatingConfigSchema>;

export const ReviewAssignmentSchema = z.object({
  taskId: z.string(),
  reviewerAgentId: z.string(),
  reviewerAgentName: z.string(),
  assignedAt: z.number(),
  dueAt: z.number(),
  status: z.enum(["pending", "completed", "expired"]),
});

export type ReviewAssignment = z.infer<typeof ReviewAssignmentSchema>;

export const MissionOrchestratorInputSchema = z.object({
  missionId: z.string(),
  teamId: z.string(),
  objective: z.string(),
  maxConcurrentRuns: z.number().int().positive().default(3),
  budgetCents: z.number().int().nonnegative().optional(),
  heartbeatIntervalMin: z.number().int().positive().default(2),
  spawnLimits: SpawnLimitsSchema.optional(),
  checkpoint: z
    .object({
      dispatchedRuns: z.number().default(0),
      completedTasks: z.number().default(0),
      consumedCents: z.number().default(0),
      lastDispatchAt: z.number().optional(),
      spawnedAgentCount: z.number().default(0),
      pendingMessages: z.array(AgentMessageEnvelopeSchema).optional(),
      crossMissionEvents: z.array(CrossMissionSignalPayloadSchema).optional(),
      spawnTree: z.array(z.tuple([z.string(), z.string()])).optional(),
    })
    .optional(),
  reviewGating: ReviewGatingConfigSchema.optional(),
  standupIntervalMin: z.number().int().positive().default(10).optional(),
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
  agentName: z.string().optional(),
  taskId: z.string(),
  runId: z.string(),
  soulPrompt: z.string(),
  tools: z.array(z.string()).optional(),
  maxSteps: z.number().int().positive().default(20),
  budgetCentsLimit: z.number().int().min(1).max(10_000).optional(),
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
  reason: z.enum([
    "initial",
    "heartbeat",
    "task",
    "mention",
    "manual",
    "run_complete",
    "spawn_backpressure",
  ]),
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

export const SpawnRegistryEntrySchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  parentAgentId: z.string().nullable(),
  spawnDepth: z.number().int().min(0),
  capabilities: z.array(z.string()),
  status: z.enum(["pending", "running", "completed", "failed"]),
  spawnedAt: z.number(),
  taskId: z.string().nullable(),
});

export type SpawnRegistryEntry = z.infer<typeof SpawnRegistryEntrySchema>;

export const SpawnAgentResultSchema = z.object({
  requestId: z.string(),
  status: z.enum(["spawned", "denied", "failed"]),
  agentId: z.string().optional(),
  taskId: z.string().optional(),
  reason: z.string(),
});

export type SpawnAgentResult = z.infer<typeof SpawnAgentResultSchema>;

export const AgentClaimTaskSignalPayloadSchema = z.object({
  claimId: z.string(),
  agentId: z.string(),
  taskId: z.string(),
  justification: z.string().max(500),
});

export type AgentClaimTaskSignalPayload = z.infer<
  typeof AgentClaimTaskSignalPayloadSchema
>;

export const AgentClaimResultSchema = z.object({
  claimId: z.string(),
  taskId: z.string(),
  granted: z.boolean(),
  reason: z.string(),
});

export type AgentClaimResult = z.infer<typeof AgentClaimResultSchema>;

export const AgentCompletedPayloadSchema = z.object({
  agentId: z.string(),
  runId: z.string(),
  status: z.enum(["completed", "failed", "cancelled", "budget_exceeded"]),
  costCents: z.number(),
  completedTasks: z.number(),
  error: z.string().optional(),
});

export type AgentCompletedPayload = z.infer<typeof AgentCompletedPayloadSchema>;
