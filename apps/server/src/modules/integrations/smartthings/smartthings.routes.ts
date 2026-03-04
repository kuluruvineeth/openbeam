import { createRoute } from "@hono/zod-openapi";
import {
  ApiKeyAuthBodySchema,
  ApiKeyAuthResponseSchema,
} from "./smartthings.schema";

export const apiKeyAuthRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["SmartThings Integration"],
  summary: "Authenticate with SmartThings Personal Access Token",
  description: "Validates a SmartThings PAT and activates the connector",
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
