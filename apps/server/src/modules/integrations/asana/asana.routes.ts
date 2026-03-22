import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
} from "./asana.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Asana Integration"],
  summary: "Start Asana OAuth flow",
  description: "Initiates the Asana OAuth authorization flow",
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
  tags: ["Asana Integration"],
  summary: "Handle Asana OAuth callback",
  description: "Completes the Asana OAuth flow and activates the connector",
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
