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
    example: "https://app.example.com/connectors",
  }),
});

export const OAuthCallbackBodySchema = z.object({
  code: z.string().openapi({
    description: "OAuth authorization code from ClickUp",
    example: "abc123",
  }),
  state: z.string().openapi({
    description: "OAuth state parameter for CSRF protection",
    example: "random_state_string",
  }),
});

export const OAuthStartResponseSchema = z.object({
  success: z.boolean(),
  oauthUrl: z.url().optional().openapi({
    description: "ClickUp OAuth authorization URL",
  }),
  message: z.string().optional().openapi({
    description: "Error message if success is false",
  }),
});

export const OAuthCallbackResponseSchema = z.object({
  success: z.boolean(),
  connectorId: z.string().optional().openapi({
    description: "Created connector ID",
  }),
  name: z.string().optional().openapi({
    description: "Connector name",
  }),
  redirectUrl: z.url().optional().openapi({
    description: "URL to redirect to",
  }),
  message: z.string().optional().openapi({
    description: "Error message if success is false",
  }),
});
