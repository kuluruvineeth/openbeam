import { z } from "@hono/zod-openapi";

/**
 * OAuth Start Query Parameters
 */
export const OAuthStartQuerySchema = z.object({
  workspaceId: z.string().optional().openapi({
    description: "Workspace ID (defaults to active team)",
    example: "team_123",
  }),
  connectorId: z.string().openapi({
    description: "Connector ID to associate with OAuth flow",
    example: "conn_123",
  }),
  redirectUrl: z.string().url().optional().openapi({
    description: "URL to redirect after OAuth completion",
    example: "https://app.example.com/connectors",
  }),
});

/**
 * OAuth Callback Body
 */
export const OAuthCallbackBodySchema = z.object({
  code: z.string().openapi({
    description: "OAuth authorization code from Slack",
    example: "1234567890.1234567890",
  }),
  state: z.string().openapi({
    description: "OAuth state parameter for CSRF protection",
    example: "random_state_string",
  }),
});

/**
 * OAuth Start Response
 */
export const OAuthStartResponseSchema = z.object({
  success: z.boolean(),
  oauthUrl: z.string().url().optional().openapi({
    description: "Slack OAuth authorization URL",
    example: "https://slack.com/oauth/v2/authorize?...",
  }),
  message: z.string().optional().openapi({
    description: "Error message if success is false",
  }),
});

/**
 * OAuth Callback Response
 */
export const OAuthCallbackResponseSchema = z.object({
  success: z.boolean(),
  connectorId: z.string().optional().openapi({
    description: "Created connector ID",
    example: "conn_123",
  }),
  name: z.string().optional().openapi({
    description: "Connector name",
    example: "Slack Workspace",
  }),
  redirectUrl: z.string().url().optional().openapi({
    description: "URL to redirect to",
    example: "https://app.example.com/connectors",
  }),
  message: z.string().optional().openapi({
    description: "Error message if success is false",
  }),
});
