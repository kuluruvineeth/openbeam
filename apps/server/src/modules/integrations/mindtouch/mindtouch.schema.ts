import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_mindtouch_123",
  }),
  apiKey: z.string().openapi({
    description: "Mindtouch API token (Bearer token)",
  }),
  instanceUrl: z.string().url().openapi({
    description:
      "Mindtouch instance URL (e.g., 'https://company.mindtouch.us')",
    example: "https://company.mindtouch.us",
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
