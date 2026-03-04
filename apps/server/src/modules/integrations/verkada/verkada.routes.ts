import { createRoute } from "@hono/zod-openapi";
import {
  ApiKeyAuthBodySchema,
  ApiKeyAuthResponseSchema,
  WebhookBodySchema,
  WebhookResponseSchema,
} from "./verkada.schema";

export const apiKeyAuthRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["Verkada Integration"],
  summary: "Authenticate with Verkada API key",
  description: "Validates a Verkada API key by exchanging it for a token",
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
  tags: ["Verkada Integration"],
  summary: "Handle Verkada webhook events",
  description: "Receives and processes Verkada webhook notifications",
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
