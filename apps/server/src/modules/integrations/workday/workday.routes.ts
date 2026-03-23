import { createRoute } from "@hono/zod-openapi";
import {
  WorkdayCallbackBodySchema,
  WorkdayCallbackResponseSchema,
  WorkdayStartAuthBodySchema,
  WorkdayStartAuthResponseSchema,
} from "./workday.schema";

export const startAuthRoute = createRoute({
  method: "post",
  path: "/auth/start",
  tags: ["Workday Integration"],
  summary: "Start Workday OAuth flow",
  description:
    "Generates the OAuth authorization URL for Workday tenant authentication",
  request: {
    body: {
      content: {
        "application/json": {
          schema: WorkdayStartAuthBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authorization URL generated",
      content: {
        "application/json": {
          schema: WorkdayStartAuthResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid input",
      content: {
        "application/json": {
          schema: WorkdayStartAuthResponseSchema,
        },
      },
    },
    401: {
      description: "User not authenticated",
      content: {
        "application/json": {
          schema: WorkdayStartAuthResponseSchema,
        },
      },
    },
  },
});

export const callbackRoute = createRoute({
  method: "post",
  path: "/callback",
  tags: ["Workday Integration"],
  summary: "Handle Workday OAuth callback",
  description:
    "Exchanges authorization code for tokens and activates connector",
  request: {
    body: {
      content: {
        "application/json": {
          schema: WorkdayCallbackBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authentication successful",
      content: {
        "application/json": {
          schema: WorkdayCallbackResponseSchema,
        },
      },
    },
    400: {
      description: "Code exchange failed",
      content: {
        "application/json": {
          schema: WorkdayCallbackResponseSchema,
        },
      },
    },
    401: {
      description: "User not authenticated",
      content: {
        "application/json": {
          schema: WorkdayCallbackResponseSchema,
        },
      },
    },
  },
});
