import { z } from "@hono/zod-openapi";

export const canvasStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const executionStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_INPUT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
]);

export const triggerTypeSchema = z.enum([
  "MANUAL",
  "SCHEDULE",
  "WEBHOOK",
  "EVENT",
]);

export const canvasIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const listCanvasQuerySchema = z.object({
  status: canvasStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const createCanvasBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(z.unknown()).default([]),
  edges: z.array(z.unknown()).default([]),
  viewport: z.unknown().optional(),
  settings: z.unknown().optional(),
  triggerType: triggerTypeSchema.optional(),
  triggerConfig: z.unknown().optional(),
});

export const updateCanvasBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(z.unknown()).optional(),
  edges: z.array(z.unknown()).optional(),
  viewport: z.unknown().optional(),
  settings: z.unknown().optional(),
  triggerType: triggerTypeSchema.optional(),
  triggerConfig: z.unknown().optional(),
});

export const publishCanvasBodySchema = z.object({
  changelog: z.string().max(1000).optional(),
});

export const listExecutionsQuerySchema = z.object({
  status: executionStatusSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const createExecutionBodySchema = z.object({
  input: z.record(z.string(), z.unknown()).optional(),
  triggerSource: z.string().optional(),
  sessionId: z.string().optional(),
  turnId: z.string().optional(),
});

export const successSchema = z.object({
  success: z.boolean(),
});

export const unknownResponseSchema = z.unknown();

export const errorSchema = z.object({
  error: z.string(),
});
