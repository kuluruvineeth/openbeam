import { z } from "zod";

export const HEARTBEAT_RUN_STATUSES = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export const HeartbeatRunStatusSchema = z.enum(HEARTBEAT_RUN_STATUSES);
export type HeartbeatRunStatus = z.infer<typeof HeartbeatRunStatusSchema>;

export const UsageSummarySchema = z.object({
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  cachedInputTokens: z.number().int().optional(),
});

export type UsageSummary = z.infer<typeof UsageSummarySchema>;

export const ControlHeartbeatRunSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  agentId: z.string(),
  invocationSource: z.string(),
  triggerDetail: z.string().nullable(),
  status: HeartbeatRunStatusSchema,
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  error: z.string().nullable(),
  wakeupRequestId: z.string().nullable(),
  exitCode: z.number().int().nullable(),
  signal: z.string().nullable(),
  usageJson: z.record(z.string(), z.unknown()).nullable(),
  resultJson: z.record(z.string(), z.unknown()).nullable(),
  sessionIdBefore: z.string().nullable(),
  sessionIdAfter: z.string().nullable(),
  logStore: z.string().nullable(),
  logRef: z.string().nullable(),
  logBytes: z.bigint().nullable(),
  logSha256: z.string().nullable(),
  logCompressed: z.boolean(),
  stdoutExcerpt: z.string().nullable(),
  stderrExcerpt: z.string().nullable(),
  errorCode: z.string().nullable(),
  externalRunId: z.string().nullable(),
  contextSnapshot: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlHeartbeatRun = z.infer<typeof ControlHeartbeatRunSchema>;

export const RUN_EVENT_STREAMS = ["system", "stdout", "stderr"] as const;
export const RunEventStreamSchema = z.enum(RUN_EVENT_STREAMS);
export type RunEventStream = z.infer<typeof RunEventStreamSchema>;

export const RUN_EVENT_LEVELS = ["info", "warn", "error"] as const;
export const RunEventLevelSchema = z.enum(RUN_EVENT_LEVELS);
export type RunEventLevel = z.infer<typeof RunEventLevelSchema>;

export const ControlHeartbeatRunEventSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  runId: z.string(),
  agentId: z.string(),
  seq: z.number().int(),
  eventType: z.string(),
  stream: RunEventStreamSchema.nullable(),
  level: RunEventLevelSchema.nullable(),
  color: z.string().nullable(),
  message: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});

export type ControlHeartbeatRunEvent = z.infer<
  typeof ControlHeartbeatRunEventSchema
>;

export const ContextSnapshotSchema = z.object({
  totalInputTokens: z.number().int().optional(),
  totalOutputTokens: z.number().int().optional(),
  totalCostCents: z.number().int().optional(),
  activeIssueCount: z.number().int().optional(),
  agentStatus: z.string().optional(),
});

export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>;
