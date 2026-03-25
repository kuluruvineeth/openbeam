import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_interact_123",
  }),
  apiKey: z.string().openapi({
    description: "Interact API key (Bearer token)",
  }),
  instance: z.string().openapi({
    description:
      "Interact instance name (e.g., 'company' for company.interactsoftware.com)",
    example: "company",
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
