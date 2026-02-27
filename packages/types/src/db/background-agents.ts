import { z } from "zod";

export const BackgroundAgentStatusSchema = z.enum([
  "PENDING",
  "INITIALIZING",
  "RUNNING",
  "PAUSED",
  "AWAITING_INPUT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
]);

export type BackgroundAgentStatus = z.infer<typeof BackgroundAgentStatusSchema>;

export const SandboxTypeSchema = z.enum(["DAYTONA", "LOCAL"]);

export type SandboxType = z.infer<typeof SandboxTypeSchema>;

export const CreateBackgroundAgentDataSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  prompt: z.string(),
  preset: z.string().optional(),
  totalSteps: z.number().int().positive().optional(),
  sandboxType: SandboxTypeSchema.optional(),
  repositoryUrl: z.string().optional(),
  baseBranch: z.string().optional(),
  maxRetries: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export type CreateBackgroundAgentData = z.infer<
  typeof CreateBackgroundAgentDataSchema
>;

export const UsageIncrementSchema = z.object({
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  estimatedCostUsd: z.number(),
});

export type UsageIncrement = z.infer<typeof UsageIncrementSchema>;

export const LogEntrySchema = z.object({
  level: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

export const ArtifactSchema = z.object({
  type: z.string(),
  path: z.string(),
  content: z.string().optional(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const BackgroundAgentResultSchema = z.object({
  output: z.string(),
  artifacts: z.array(ArtifactSchema).optional(),
  pullRequestUrl: z.string().optional(),
});

export type BackgroundAgentResult = z.infer<typeof BackgroundAgentResultSchema>;

export const BackgroundAgentCheckpointDataSchema = z.object({
  version: z.number().int(),
  state: z.unknown(),
  memorySnapshot: z.unknown().optional(),
  contextWindow: z.unknown().optional(),
  stepIndex: z.number().int(),
  description: z.string().optional(),
});

export type BackgroundAgentCheckpointData = z.infer<
  typeof BackgroundAgentCheckpointDataSchema
>;

export const BackgroundAgentStatusUpdateSchema = z.object({
  progress: z.number().optional(),
  currentStep: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  lastActivityAt: z.date().optional(),
});

export type BackgroundAgentStatusUpdate = z.infer<
  typeof BackgroundAgentStatusUpdateSchema
>;
