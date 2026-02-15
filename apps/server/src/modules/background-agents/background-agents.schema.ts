import { z } from "@hono/zod-openapi";

export const backgroundAgentStatusSchema = z.enum([
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

export const sandboxTypeSchema = z.enum(["e2b", "docker", "local"]);

export const agentIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const listAgentsQuerySchema = z.object({
  status: backgroundAgentStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const createAgentBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  prompt: z.string().min(1).max(10_000),
  preset: z
    .enum(["researcher", "coder", "analyst", "writer", "custom"])
    .default("researcher"),
  sandboxType: sandboxTypeSchema.default("e2b"),
  repositoryUrl: z.string().url().optional(),
  baseBranch: z.string().optional(),
  timeoutMs: z.number().int().positive().max(3_600_000).optional(),
});

export const listLogsQuerySchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export const resumeAgentBodySchema = z.object({
  fromCheckpoint: z.number().int().nonnegative().optional(),
});

export const successSchema = z.object({
  success: z.boolean(),
});

export const unknownResponseSchema = z.unknown();

export const errorSchema = z.object({
  error: z.string(),
});
