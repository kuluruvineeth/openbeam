import { createRoute } from "@hono/zod-openapi";
import {
  ApiKeyAuthBodySchema,
  ApiKeyAuthResponseSchema,
} from "./opsgenie.schema";

export const apiKeyAuthRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["OpsGenie Integration"],
  summary: "Authenticate with OpsGenie API key",
  description:
    "Validates an OpsGenie GenieKey by calling the services endpoint, then activates the connector",
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
      description: "Invalid API key",
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
