import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
} from "./microsoft-calendar.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Microsoft Calendar Integration"],
  summary: "Start Microsoft Calendar OAuth flow",
  description:
    "Initiates the Microsoft Calendar OAuth authorization flow via Microsoft identity platform",
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
  tags: ["Microsoft Calendar Integration"],
  summary: "Handle Microsoft Calendar OAuth callback",
  description:
    "Completes the Microsoft Calendar OAuth flow and activates the connector",
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
