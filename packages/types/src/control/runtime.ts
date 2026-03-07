import { z } from "zod";
import { PrincipalTypeSchema } from "./access";
import { ControlAgentAdapterTypeSchema } from "./agents";

export const ControlAgentRuntimeStateSchema = z.object({
  agentId: z.string(),
  teamId: z.string(),
  adapterType: ControlAgentAdapterTypeSchema,
  sessionId: z.string().nullable(),
  stateJson: z.record(z.string(), z.unknown()),
  lastRunId: z.string().nullable(),
  lastRunStatus: z.string().nullable(),
  totalInputTokens: z.bigint(),
  totalOutputTokens: z.bigint(),
  totalCachedInputTokens: z.bigint(),
  totalCostCents: z.bigint(),
  lastError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlAgentRuntimeState = z.infer<
  typeof ControlAgentRuntimeStateSchema
>;

export const ControlAgentTaskSessionSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  agentId: z.string(),
  adapterType: ControlAgentAdapterTypeSchema,
  taskKey: z.string(),
  sessionParamsJson: z.record(z.string(), z.unknown()).nullable(),
  sessionDisplayId: z.string().nullable(),
  lastRunId: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlAgentTaskSession = z.infer<
  typeof ControlAgentTaskSessionSchema
>;

export const WAKEUP_SOURCES = [
  "TIMER",
  "ASSIGNMENT",
  "ON_DEMAND",
  "AUTOMATION",
] as const;

export const WakeupSourceSchema = z.enum(WAKEUP_SOURCES);
export type WakeupSource = z.infer<typeof WakeupSourceSchema>;

export const WAKEUP_STATUSES = [
  "QUEUED",
  "CLAIMED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export const WakeupStatusSchema = z.enum(WAKEUP_STATUSES);
export type WakeupStatus = z.infer<typeof WakeupStatusSchema>;

export const ControlAgentWakeupRequestSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  agentId: z.string(),
  source: WakeupSourceSchema,
  triggerDetail: z.string().nullable(),
  reason: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable(),
  status: WakeupStatusSchema,
  coalescedCount: z.number().int(),
  requestedByActorType: PrincipalTypeSchema.nullable(),
  requestedByActorId: z.string().nullable(),
  idempotencyKey: z.string().nullable(),
  runId: z.string().nullable(),
  requestedAt: z.date(),
  claimedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  error: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ControlAgentWakeupRequest = z.infer<
  typeof ControlAgentWakeupRequestSchema
>;
