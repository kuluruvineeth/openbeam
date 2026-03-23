import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_freshservice_123",
  }),
  apiKey: z.string().openapi({
    description: "Freshservice API key from your profile settings",
  }),
  domain: z.string().openapi({
    description:
      "Freshservice subdomain (e.g., 'acme' for acme.freshservice.com)",
    example: "acme",
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
