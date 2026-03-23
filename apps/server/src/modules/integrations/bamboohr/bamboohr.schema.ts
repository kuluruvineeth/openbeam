import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_bamboohr_123",
  }),
  apiKey: z.string().openapi({
    description: "BambooHR API key (generated from Account > API Keys)",
  }),
  subdomain: z.string().openapi({
    description:
      "BambooHR company subdomain (e.g., 'acme' from acme.bamboohr.com)",
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
