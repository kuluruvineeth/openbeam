import { z } from "@hono/zod-openapi";

export const missionStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

export const missionIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const listMissionsQuerySchema = z.object({
  status: missionStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const createMissionBodySchema = z.object({
  objective: z.string().min(1).max(5000),
  budgetCents: z.number().int().positive().optional(),
  maxConcurrentRuns: z.number().int().min(1).max(10).default(3),
  heartbeatIntervalMin: z.number().int().min(1).max(1440).optional(),
  cronSchedule: z.string().min(9).max(100).optional(),
});

export const updateMissionBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  objective: z.string().min(1).max(5000).optional(),
  budgetCents: z.number().int().positive().nullable().optional(),
  maxConcurrentRuns: z.number().int().min(1).max(10).optional(),
  heartbeatIntervalMin: z.number().int().min(1).max(1440).optional(),
});

export const spawnAgentBodySchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  tools: z.array(z.string()).default([]),
  taskId: z.string().optional(),
});

export const broadcastBodySchema = z.object({
  content: z.string().min(1).max(10_000),
});

export const successSchema = z.object({
  success: z.boolean(),
});

export const startMissionResponseSchema = z.object({
  missionId: z.string(),
  workflowId: z.string(),
});

export const spawnAgentResponseSchema = z.object({
  success: z.boolean(),
  agentId: z.string(),
  taskId: z.string(),
});

export const broadcastResponseSchema = z.object({
  success: z.boolean(),
  messageId: z.string(),
});

export const unknownResponseSchema = z.unknown();

export const errorSchema = z.object({
  error: z.string(),
});
