import { z } from "@hono/zod-openapi";

export const AuthBodySchema = z.object({
  connectorId: z.string().openapi({
    description: "Connector ID to authenticate",
    example: "conn_netsuite_123",
  }),
  accountId: z.string().openapi({
    description: "NetSuite account ID (e.g., 1234567 or TSTDRV1234567)",
    example: "1234567",
  }),
  consumerKey: z.string().openapi({
    description: "OAuth 1.0 consumer key from integration record",
  }),
  consumerSecret: z.string().openapi({
    description: "OAuth 1.0 consumer secret",
  }),
  tokenKey: z.string().openapi({
    description: "Access token ID",
  }),
  tokenSecret: z.string().openapi({
    description: "Access token secret",
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
