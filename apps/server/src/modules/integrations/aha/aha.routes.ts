import { createRoute } from "@hono/zod-openapi";
import { ApiKeyAuthBodySchema, ApiKeyAuthResponseSchema } from "./aha.schema";

export const apiKeyAuthRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["Aha! Integration"],
  summary: "Authenticate with Aha! API key",
  description:
    "Validates an Aha! API key by calling the /me endpoint, then activates the connector",
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
      description: "Invalid API key or subdomain",
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
