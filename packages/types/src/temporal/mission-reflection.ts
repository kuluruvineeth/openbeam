import { z } from "zod";

export const StepEvaluationSchema = z.object({
  progressScore: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  stuckIndicators: z.object({
    repeatingActions: z.boolean(),
    noNewArtifacts: z.boolean(),
    errorLoop: z.boolean(),
    progressPlateau: z.boolean(),
  }),
  reasoning: z.string(),
  suggestedAction: z.enum(["continue", "replan", "escalate"]),
});

export type StepEvaluation = z.infer<typeof StepEvaluationSchema>;

export const ReflectionEntrySchema = z.object({
  step: z.number(),
  evaluation: StepEvaluationSchema,
  approach: z.string(),
  outcome: z.string(),
  timestamp: z.number(),
});

export type ReflectionEntry = z.infer<typeof ReflectionEntrySchema>;

export const ReplanRequestSchema = z.object({
  missionId: z.string(),
  taskId: z.string(),
  agentId: z.string(),
  currentApproach: z.string(),
  reflectionBuffer: z.array(ReflectionEntrySchema),
  failurePatterns: z.array(z.string()),
  taskContext: z.object({
    title: z.string(),
    description: z.string().nullable(),
    priorAttempts: z.number(),
  }),
});

export type ReplanRequest = z.infer<typeof ReplanRequestSchema>;

export const ReplanResultSchema = z.object({
  newApproach: z.string(),
  strategyShift: z.string(),
  adjustedPrompt: z.string(),
  reasoning: z.string(),
});

export type ReplanResult = z.infer<typeof ReplanResultSchema>;

export const EscalationRequestSchema = z.object({
  missionId: z.string(),
  taskId: z.string(),
  agentId: z.string(),
  reason: z.string(),
  reflectionBuffer: z.array(ReflectionEntrySchema),
  attemptedApproaches: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
});

export type EscalationRequest = z.infer<typeof EscalationRequestSchema>;

export const CriticIssueSchema = z.object({
  severity: z.enum(["blocking", "major", "minor"]),
  description: z.string(),
});

export type CriticIssue = z.infer<typeof CriticIssueSchema>;

export const CriticReviewSchema = z.object({
  passed: z.boolean(),
  qualityScore: z.number().min(0).max(1),
  issues: z.array(CriticIssueSchema),
  recommendation: z.enum(["accept", "revise", "reject"]),
});

export type CriticReview = z.infer<typeof CriticReviewSchema>;

export const MissionHealthAgentStatusSchema = z.enum([
  "progressing",
  "slow",
  "stuck",
  "escalated",
  "completed",
]);

export type MissionHealthAgentStatus = z.infer<
  typeof MissionHealthAgentStatusSchema
>;

export const MissionHealthAgentSchema = z.object({
  agentId: z.string(),
  taskId: z.string(),
  stepsCompleted: z.number(),
  lastProgressScore: z.number(),
  stuckSince: z.number().nullable(),
  replanCount: z.number(),
  status: MissionHealthAgentStatusSchema,
});

export type MissionHealthAgent = z.infer<typeof MissionHealthAgentSchema>;

export const MissionHealthDependencyFailureSchema = z.object({
  failedTaskId: z.string(),
  blockedTaskIds: z.array(z.string()),
});

export type MissionHealthDependencyFailure = z.infer<
  typeof MissionHealthDependencyFailureSchema
>;

export const MissionHealthSnapshotSchema = z.object({
  missionId: z.string(),
  timestamp: z.number(),
  agents: z.array(MissionHealthAgentSchema),
  stalledTasks: z.array(z.string()),
  failedDependencies: z.array(MissionHealthDependencyFailureSchema),
});

export type MissionHealthSnapshot = z.infer<typeof MissionHealthSnapshotSchema>;

export const FailurePatternSchema = z.object({
  pattern: z.string(),
  frequency: z.number(),
  lastSeen: z.number(),
  taskTypes: z.array(z.string()),
  avoidanceStrategy: z.string(),
});

export type FailurePattern = z.infer<typeof FailurePatternSchema>;

export const DependencyFailurePayloadSchema = z.object({
  failedTaskId: z.string(),
  failedTaskTitle: z.string(),
  reason: z.string(),
  blockedTaskIds: z.array(z.string()),
});

export type DependencyFailurePayload = z.infer<
  typeof DependencyFailurePayloadSchema
>;

export const PeerReviewVerdictSchema = z.enum(["approve", "revise", "reject"]);
export type PeerReviewVerdict = z.infer<typeof PeerReviewVerdictSchema>;

export const PeerReviewSchema = z.object({
  reviewId: z.string(),
  taskId: z.string(),
  artifactId: z.string().optional(),
  reviewerAgentId: z.string(),
  reviewerAgentName: z.string(),
  authorAgentId: z.string(),
  verdict: PeerReviewVerdictSchema,
  qualityScore: z.number().min(0).max(1),
  issues: z.array(CriticIssueSchema),
  strengths: z.array(z.string()).max(5),
  suggestion: z.string().max(1000).optional(),
  timestamp: z.number(),
});

export type PeerReview = z.infer<typeof PeerReviewSchema>;

export const ReviewConsensusSchema = z.object({
  taskId: z.string(),
  reviews: z.array(PeerReviewSchema),
  finalVerdict: PeerReviewVerdictSchema,
  averageQualityScore: z.number().min(0).max(1),
  unanimousApproval: z.boolean(),
  hasVeto: z.boolean(),
  reasoning: z.string(),
});

export type ReviewConsensus = z.infer<typeof ReviewConsensusSchema>;

export const StandupReportSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  taskId: z.string(),
  taskTitle: z.string(),
  status: z.enum(["on_track", "blocked", "needs_help", "completed", "idle"]),
  progressSummary: z.string().max(500),
  blockers: z.array(z.string()).max(5),
  nextSteps: z.array(z.string()).max(5),
  requestsHelp: z.boolean(),
  timestamp: z.number(),
});

export type StandupReport = z.infer<typeof StandupReportSchema>;

export const StandupConflictSchema = z.object({
  type: z.enum([
    "duplicate_work",
    "blocked_chain",
    "priority_mismatch",
    "resource_contention",
  ]),
  agentIds: z.array(z.string()),
  description: z.string(),
  suggestedResolution: z.string(),
});

export type StandupConflict = z.infer<typeof StandupConflictSchema>;

export const StandupSummarySchema = z.object({
  roundId: z.string(),
  missionId: z.string(),
  timestamp: z.number(),
  reports: z.array(StandupReportSchema),
  conflicts: z.array(StandupConflictSchema),
  overallHealth: z.enum(["healthy", "degraded", "critical"]),
  actionItems: z.array(z.string()),
  missedAgents: z.array(z.string()),
});

export type StandupSummary = z.infer<typeof StandupSummarySchema>;
