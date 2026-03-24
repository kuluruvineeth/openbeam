import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_amplitude_123",
  }),
  apiKey: z.string().openapi({
    description: "Amplitude API Key",
  }),
  secretKey: z.string().openapi({
    description: "Amplitude Secret Key",
  }),
  orgSlug: z.string().optional().openapi({
    description: "Amplitude organization slug for URL building",
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
