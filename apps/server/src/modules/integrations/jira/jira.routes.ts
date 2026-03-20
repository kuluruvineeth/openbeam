import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
  WebhookParamsSchema,
  WebhookResponseSchema,
} from "./jira.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Jira Integration"],
  summary: "Start Jira OAuth flow",
  description:
    "Initiates the Jira OAuth authorization flow via Atlassian identity platform",
  request: {
    query: OAuthStartQuerySchema,
  },
  responses: {
    200: {
      description: "OAuth URL generated successfully",
      content: {
        "application/json": { schema: OAuthStartResponseSchema },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": { schema: OAuthStartResponseSchema },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": { schema: OAuthStartResponseSchema },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": { schema: OAuthStartResponseSchema },
      },
    },
  },
});

export const oauthCallbackRoute = createRoute({
  method: "post",
  path: "/callback",
  tags: ["Jira Integration"],
  summary: "Handle Jira OAuth callback",
  description: "Completes the Jira OAuth flow and activates the connector",
  request: {
    body: {
      content: {
        "application/json": { schema: OAuthCallbackBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "OAuth completed successfully",
      content: {
        "application/json": { schema: OAuthCallbackResponseSchema },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": { schema: OAuthCallbackResponseSchema },
      },
    },
  },
});

export const webhookRoute = createRoute({
  method: "post",
  path: "/webhook/:connectorId/:token",
  tags: ["Jira Integration"],
  summary: "Handle Jira webhook events",
  description:
    "Receives real-time Jira events (issue deletion) via registered webhooks",
  request: {
    params: WebhookParamsSchema,
  },
  responses: {
    200: {
      description: "Webhook processed",
      content: {
        "application/json": { schema: WebhookResponseSchema },
      },
    },
    401: {
      description: "Invalid token",
      content: {
        "application/json": { schema: WebhookResponseSchema },
      },
    },
  },
});
