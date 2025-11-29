import { createRoute } from "@hono/zod-openapi";
import {
  OAuthCallbackBodySchema,
  OAuthCallbackResponseSchema,
  OAuthStartQuerySchema,
  OAuthStartResponseSchema,
  ServiceAccountAuthBodySchema,
  ServiceAccountAuthResponseSchema,
} from "./gmail.schema";

export const startOAuthRoute = createRoute({
  method: "get",
  path: "/oauth/start",
  tags: ["Gmail Integration"],
  summary: "Start Gmail OAuth flow",
  description:
    "Initiates the Gmail OAuth authorization flow for personal accounts",
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
  tags: ["Gmail Integration"],
  summary: "Handle Gmail OAuth callback",
  description: "Completes the Gmail OAuth flow and activates the connector",
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

export const serviceAccountAuthRoute = createRoute({
  method: "post",
  path: "/service-account/auth",
  tags: ["Gmail Integration"],
  summary: "Authenticate with service account",
  description:
    "Authenticates Gmail connector using Google Workspace service account with domain-wide delegation",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ServiceAccountAuthBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Service account authentication successful",
      content: {
        "application/json": {
          schema: ServiceAccountAuthResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing or invalid credentials",
      content: {
        "application/json": {
          schema: ServiceAccountAuthResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - user not authenticated",
      content: {
        "application/json": {
          schema: ServiceAccountAuthResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ServiceAccountAuthResponseSchema,
        },
      },
    },
  },
});
