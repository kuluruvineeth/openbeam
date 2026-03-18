import { createRoute, z } from "@hono/zod-openapi";
import { feedbackBodySchema } from "./schema";

const tags = ["Public"];

export const createFeedbackRoute = createRoute({
  tags,
  method: "post",
  path: "/",
  summary: "Submit user feedback",
  description:
    "Submit feedback (voice or text) which creates a GitHub issue. PII is redacted. Rate limited to 3 req/min per IP.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: feedbackBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Feedback submitted",
      content: {
        "application/json": {
          schema: z.object({
            ok: z.boolean(),
          }),
        },
      },
    },
    400: {
      description: "Invalid input",
      content: {
        "application/json": {
          schema: z.object({
            ok: z.boolean(),
          }),
        },
      },
    },
    429: {
      description: "Rate limited",
    },
  },
});
