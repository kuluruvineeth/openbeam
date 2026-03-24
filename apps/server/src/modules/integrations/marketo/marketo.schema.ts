import { z } from "@hono/zod-openapi";

export const AuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_marketo_123",
  }),
  munchkinId: z.string().openapi({
    description: "Marketo Munchkin ID (instance identifier)",
    example: "123-ABC-456",
  }),
  clientId: z.string().openapi({
    description: "OAuth client ID from Marketo LaunchPoint",
  }),
  clientSecret: z.string().openapi({
    description: "OAuth client secret from Marketo LaunchPoint",
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
