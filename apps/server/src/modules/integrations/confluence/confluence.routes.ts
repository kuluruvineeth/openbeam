import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
} from "./confluence.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Confluence Integration"],
  summary: "Start Confluence OAuth flow",
  description:
    "Initiates the Confluence OAuth authorization flow via Atlassian identity platform",
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
  tags: ["Confluence Integration"],
  summary: "Handle Confluence OAuth callback",
  description:
    "Completes the Confluence OAuth flow and activates the connector",
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
