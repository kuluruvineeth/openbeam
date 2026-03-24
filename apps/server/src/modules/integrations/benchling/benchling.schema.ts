import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_benchling_123",
  }),
  apiKey: z.string().openapi({
    description: "Benchling API key (used as Basic auth username)",
  }),
  tenant: z.string().openapi({
    description:
      "Benchling tenant name (e.g., 'mycompany' for mycompany.benchling.com)",
    example: "mycompany",
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
