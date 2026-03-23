import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
} from "./miro.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Miro Integration"],
  summary: "Start Miro OAuth flow",
  description: "Initiates the Miro OAuth authorization flow",
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
  tags: ["Miro Integration"],
  summary: "Handle Miro OAuth callback",
  description: "Completes the Miro OAuth flow and activates the connector",
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
