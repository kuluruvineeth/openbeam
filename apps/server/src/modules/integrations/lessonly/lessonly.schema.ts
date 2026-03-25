import { z } from "@hono/zod-openapi";

export const ApiKeyAuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_lessonly_123",
  }),
  apiKey: z.string().openapi({
    description: "Lessonly API key (used as Basic auth password)",
  }),
  subdomain: z.string().openapi({
    description:
      "Lessonly subdomain (e.g., 'mycompany' for mycompany.lessonly.com)",
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
