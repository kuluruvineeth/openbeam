import { z } from "@hono/zod-openapi";

export const AuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_coupa_123",
  }),
  instanceUrl: z.string().openapi({
    description: "Coupa instance URL (e.g., https://yourcompany.coupahost.com)",
    example: "https://acme.coupahost.com",
  }),
  clientId: z.string().openapi({
    description: "OAuth 2.0 client ID from Coupa integration setup",
  }),
  clientSecret: z.string().openapi({
    description: "OAuth 2.0 client secret from Coupa integration setup",
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
