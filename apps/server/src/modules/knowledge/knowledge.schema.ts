import { z } from "@hono/zod-openapi";

export const entityTypeSchema = z.enum([
  "PERSON",
  "TEAM",
  "PROJECT",
  "TOPIC",
  "TECHNOLOGY",
  "LOCATION",
  "ORGANIZATION",
  "CHANNEL",
  "REPOSITORY",
]);

export const entityIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const listEntitiesQuerySchema = z.object({
  type: entityTypeSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const searchEntitiesQuerySchema = z.object({
  query: z.string().min(1).max(100),
  type: entityTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export const relationsQuerySchema = z.object({
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
});

export const limitQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
});

export const errorSchema = z.object({
  error: z.string(),
});
