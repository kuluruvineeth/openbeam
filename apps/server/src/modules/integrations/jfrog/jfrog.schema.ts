import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_jfrog_123",
  }),
  accessToken: z.string().openapi({
    description: "JFrog access token or API key",
  }),
  instanceUrl: z.string().url().openapi({
    description: "JFrog Platform URL (e.g., https://mycompany.jfrog.io)",
    example: "https://mycompany.jfrog.io",
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
