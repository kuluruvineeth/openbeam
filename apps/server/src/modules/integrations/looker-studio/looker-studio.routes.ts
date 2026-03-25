import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
} from "./looker-studio.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Looker Studio Integration"],
  summary: "Start Looker Studio OAuth flow",
  description: "Initiates the Looker Studio OAuth authorization flow",
  request: {
    query: OAuthStartQuerySchema,
  },
  responses: {
    200: {
      description: "OAuth URL generated successfully",
      content: {
        "application/json": {
          schema: OAuthStartResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing required parameters",
      content: {
        "application/json": {
          schema: OAuthStartResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - user not authenticated",
      content: {
        "application/json": {
          schema: OAuthStartResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: OAuthStartResponseSchema,
        },
      },
    },
  },
});

export const oauthCallbackRoute = createRoute({
  method: "post",
  path: "/callback",
  tags: ["Looker Studio Integration"],
  summary: "Handle Looker Studio OAuth callback",
  description:
    "Completes the Looker Studio OAuth flow and activates the connector",
  request: {
    body: {
      content: {
        "application/json": {
          schema: OAuthCallbackBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "OAuth completed successfully",
      content: {
        "application/json": {
          schema: OAuthCallbackResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - invalid code or state",
      content: {
        "application/json": {
          schema: OAuthCallbackResponseSchema,
        },
      },
    },
  },
});
