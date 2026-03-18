import { z } from "@hono/zod-openapi";

export const feedbackBodySchema = z.object({
  text: z.string().min(10).max(2000),
  category: z.enum(["data-request", "bug", "enhancement", "ux-feedback"]),
  page: z.string().max(200),
  inputMethod: z.enum(["voice", "text"]),
  context: z
    .object({
      lastQuery: z.string().max(500).optional(),
      resultCount: z.number().int().optional(),
      dataset: z.string().max(50).optional(),
    })
    .optional(),
});

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;
