import { createRoute } from "@hono/zod-openapi";
import {
  ApiKeyAuthBodySchema,
  ApiKeyAuthResponseSchema,
} from "./datadog.schema";

export const apiKeyAuthRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["Datadog Integration"],
  summary: "Authenticate with Datadog API key and Application key",
  description:
    "Validates Datadog credentials by calling the validate endpoint, then activates the connector",
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
      description: "Invalid API key or Application key",
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
