import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_aha_123",
  }),
  apiKey: z.string().openapi({
    description: "Aha! API key (Bearer token)",
  }),
  subdomain: z.string().openapi({
    description: "Aha! subdomain (e.g., 'company' for company.aha.io)",
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
