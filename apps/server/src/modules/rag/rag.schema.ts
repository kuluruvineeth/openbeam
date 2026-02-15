import { z } from "@hono/zod-openapi";

export const askBodySchema = z.object({
  query: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  includeMedia: z.boolean().default(true),
  sourceId: z.string().optional(),
});

export const streamBodySchema = askBodySchema;

export const conversationListQuerySchema = z.object({
  status: z.enum(["active", "archived"]).default("active"),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const conversationIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const errorSchema = z.object({
  error: z.string(),
});

export const successSchema = z.object({
  success: z.boolean(),
});

export const createConversationResponseSchema = z.object({
  id: z.string(),
  success: z.boolean(),
});

export const askResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.unknown()),
  grounding: z.unknown().optional(),
  conversationId: z.string().nullable().optional(),
  usage: z.unknown().optional(),
  timing: z.unknown().optional(),
});
