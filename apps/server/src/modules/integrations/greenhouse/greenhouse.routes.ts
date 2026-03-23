import { createRoute } from "@hono/zod-openapi";
import {
  ApiKeyAuthBodySchema,
  ApiKeyAuthResponseSchema,
} from "./greenhouse.schema";

export const apiKeyAuthRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["Greenhouse Integration"],
  summary: "Authenticate with Greenhouse Harvest API key",
  description:
    "Validates a Greenhouse Harvest API key and activates the connector",
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
      description: "Invalid API key or Greenhouse not accessible",
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
