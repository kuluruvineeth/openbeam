import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_samsara_123",
  }),
  apiToken: z.string().openapi({
    description: "Samsara API token from Settings > API Tokens",
  }),
  region: z.enum(["us", "eu"]).default("us").openapi({
    description: "Samsara API region",
    example: "us",
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

export const WebhookBodySchema = z.object({}).passthrough();

export const WebhookResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
