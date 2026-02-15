import { z } from "@hono/zod-openapi";

export const connectorIdParamsSchema = z.object({
  connectorId: z.string().openapi({
    param: {
      name: "connectorId",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const documentIdParamsSchema = z.object({
  documentId: z.string().openapi({
    param: {
      name: "documentId",
      in: "path",
    },
    example: "doc_123",
  }),
});

export const userQuerySchema = z.object({
  userId: z.string().min(1).optional(),
});

export const invalidateCacheBodySchema = z.object({
  scope: z.enum(["user", "connector", "all"]),
  userId: z.string().min(1).optional(),
  connectorId: z.string().min(1).optional(),
});

export const successSchema = z.object({
  success: z.boolean(),
});

export const errorSchema = z.object({
  error: z.string(),
});
