import { createRoute } from "@hono/zod-openapi";
import { AuthBodySchema, AuthResponseSchema } from "./nice-cxone.schema";

export const authRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["NICE CXone Integration"],
  summary: "Authenticate with NICE CXone client credentials",
  description:
    "Validates NICE CXone OAuth 2.0 client credentials by obtaining an access token and running a health check",
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
