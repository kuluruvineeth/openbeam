import { z } from "@hono/zod-openapi";

export const OAuthStartQuerySchema = z.object({
  workspaceId: z.string().optional().openapi({
    description: "Workspace ID (defaults to active team)",
    example: "team_123",
  }),
  connectorId: z.string().openapi({
    description: "Connector ID to associate with OAuth flow",
    example: "conn_123",
  }),
  redirectUrl: z.url().optional().openapi({
    description: "URL to redirect after OAuth completion",
  }),
});

export const OAuthCallbackBodySchema = z.object({
  code: z.string().openapi({
    description: "OAuth authorization code from Google",
  }),
  state: z.string().openapi({
    description: "OAuth state parameter for CSRF protection",
  }),
});

export const OAuthStartResponseSchema = z.object({
  success: z.boolean(),
  oauthUrl: z.url().optional(),
  message: z.string().optional(),
});

export const OAuthCallbackResponseSchema = z.object({
  success: z.boolean(),
  connectorId: z.string().optional(),
  name: z.string().optional(),
  redirectUrl: z.url().optional(),
  message: z.string().optional(),
});
