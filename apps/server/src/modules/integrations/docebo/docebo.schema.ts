import { z } from "@hono/zod-openapi";

export const AuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_docebo_123",
  }),
  instanceUrl: z.string().openapi({
    description:
      "Docebo instance URL (e.g., https://yourcompany.docebosaas.com)",
    example: "https://acme.docebosaas.com",
  }),
  clientId: z.string().openapi({
    description: "OAuth 2.0 client ID from Docebo API credentials",
  }),
  clientSecret: z.string().openapi({
    description: "OAuth 2.0 client secret from Docebo API credentials",
  }),
});

export const AuthResponseSchema = z.object({
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
