import { createRoute } from "@hono/zod-openapi";
import { AuthBodySchema, AuthResponseSchema } from "./marketo.schema";

export const authRoute = createRoute({
  method: "post",
  path: "/auth",
  tags: ["Marketo Integration"],
  summary: "Authenticate with Marketo client credentials",
  description:
    "Validates Marketo OAuth client credentials by obtaining an access token and running a health check",
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
