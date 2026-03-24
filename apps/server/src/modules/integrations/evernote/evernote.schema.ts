import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_evernote_123",
  }),
  developerToken: z.string().openapi({
    description: "Evernote developer token (generated from dev.evernote.com)",
  }),
  environment: z
    .enum(["production", "sandbox"])
    .optional()
    .default("production")
    .openapi({
      description: "Evernote environment (production or sandbox)",
    }),
});

export const ApiKeyAuthResponseSchema = z.object({
  success: z.boolean(),
  connectorId: z.string().optional().openapi({
    description: "Authenticated connector ID",
  }),
  name: z.string().optional().openapi({
    description: "Connector display name",
  }),
  message: z.string().optional().openapi({
    description: "Error message if authentication failed",
  }),
});
