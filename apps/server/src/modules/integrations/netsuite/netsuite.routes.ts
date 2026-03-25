import { createRoute } from "@hono/zod-openapi";
import { AuthBodySchema, AuthResponseSchema } from "./netsuite.schema";

export const authRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["NetSuite Integration"],
  summary: "Authenticate with NetSuite TBA credentials",
  description:
    "Validates NetSuite OAuth 1.0 Token-Based Authentication credentials by making a test API call",
  request: {
    body: {
      content: {
        "application/json": {
          schema: AuthBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Authentication successful",
      content: {
        "application/json": {
          schema: AuthResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: AuthResponseSchema,
        },
      },
    },
    401: {
      description: "User not authenticated",
      content: {
        "application/json": {
          schema: AuthResponseSchema,
        },
      },
    },
  },
});
