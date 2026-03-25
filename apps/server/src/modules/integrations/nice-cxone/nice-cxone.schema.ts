import { z } from "@hono/zod-openapi";

export const AuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_nice_cxone_123",
  }),
  baseUrl: z.string().openapi({
    description:
      "NICE CXone base URL (e.g., https://api-c32.niceincontact.com)",
    example: "https://api-c32.niceincontact.com",
  }),
  clientId: z.string().openapi({
    description: "OAuth 2.0 client ID from CXone API Applications",
  }),
  clientSecret: z.string().openapi({
    description: "OAuth 2.0 client secret from CXone API Applications",
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
