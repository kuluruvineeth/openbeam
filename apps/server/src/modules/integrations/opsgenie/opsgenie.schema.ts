import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_opsgenie_123",
  }),
  apiKey: z.string().openapi({
    description: "OpsGenie GenieKey API key",
  }),
  region: z.enum(["us", "eu"]).optional().default("us").openapi({
    description: "OpsGenie instance region",
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
