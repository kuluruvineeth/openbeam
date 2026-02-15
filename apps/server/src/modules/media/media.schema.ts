import { z } from "@hono/zod-openapi";

export const vespaIdParamsSchema = z.object({
  vespaId: z.string().openapi({
    param: {
      name: "vespaId",
      in: "path",
    },
    example: "media:abc123",
  }),
});

export const mediaIdParamsSchema = z.object({
  mediaId: z.string().openapi({
    param: {
      name: "mediaId",
      in: "path",
    },
    example: "media_123",
  }),
});

export const forceRefreshQuerySchema = z.object({
  forceRefresh: z.coerce.boolean().default(false),
});

export const regenerateBodySchema = z.object({
  contentTypes: z
    .array(z.enum(["chapters", "highlights", "summary", "transcript"]))
    .min(1),
});

export const askBodySchema = z.object({
  question: z.string().min(1),
});

export const errorSchema = z.object({
  error: z.string(),
});
