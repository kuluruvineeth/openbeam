import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
} from "./lucid.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Lucid Integration"],
  summary: "Start Lucid OAuth flow",
  description: "Initiates the Lucid OAuth authorization flow",
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
  tags: ["Lucid Integration"],
  summary: "Handle Lucid OAuth callback",
  description: "Completes the Lucid OAuth flow and activates the connector",
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
