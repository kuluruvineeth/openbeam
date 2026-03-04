import { createRoute } from "@hono/zod-openapi";
import {
  ApiKeyAuthBodySchema,
  ApiKeyAuthResponseSchema,
  WebhookBodySchema,
  WebhookResponseSchema,
} from "./samsara.schema";

export const apiKeyAuthRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["Samsara Integration"],
  summary: "Authenticate with Samsara API token",
  description: "Validates a Samsara API token and activates the connector",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ApiKeyAuthBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authentication successful",
      content: {
        "application/json": {
          schema: ApiKeyAuthResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: ApiKeyAuthResponseSchema,
        },
      },
    },
    401: {
      description: "User not authenticated",
      content: {
        "application/json": {
          schema: ApiKeyAuthResponseSchema,
        },
      },
    },
  },
});

export const webhookRoute = createRoute({
  method: "post",
  path: "/webhook",
  tags: ["Samsara Integration"],
  summary: "Handle Samsara webhook events",
  description: "Receives and processes Samsara webhook notifications",
  request: {
    body: {
      content: {
        "application/json": {
          schema: WebhookBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook processed",
      content: {
        "application/json": {
          schema: WebhookResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid webhook signature",
      content: {
        "application/json": {
          schema: WebhookResponseSchema,
        },
      },
    },
  },
});
