import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_insided_123",
  }),
  apiKey: z.string().openapi({
    description: "InSided API key (Bearer token)",
  }),
  communityUrl: z.string().url().openapi({
    description:
      "InSided community URL (e.g., 'https://community.example.com')",
    example: "https://community.example.com",
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
