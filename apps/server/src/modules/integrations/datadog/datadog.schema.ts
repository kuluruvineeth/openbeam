import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_datadog_123",
  }),
  apiKey: z.string().openapi({
    description: "Datadog API key",
  }),
  appKey: z.string().openapi({
    description: "Datadog Application key",
  }),
  site: z
    .enum(["us1", "us3", "us5", "eu", "ap1", "gov"])
    .optional()
    .default("us1")
    .openapi({
      description: "Datadog site region",
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
