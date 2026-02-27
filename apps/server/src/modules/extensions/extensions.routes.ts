import { createRoute } from "@hono/zod-openapi";
import {
  extensionChatSubmitBodySchema,
  extensionChatSubmitResponseSchema,
  extensionErrorSchema,
  extensionNotAuthorizedSchema,
} from "./extensions.schema";

const tags = ["Extensions"];

export const submitExtensionChatRoute = createRoute({
  tags,
  method: "post",
  path: "/chat/submit",
  summary: "Submit extension chat prompt and receive a proposed action",
  request: {
    body: {
      content: {
        "application/json": {
          schema: extensionChatSubmitBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: extensionChatSubmitResponseSchema,
        },
      },
      description: "Action proposal returned",
    },
    400: {
      content: {
        "application/json": {
          schema: extensionErrorSchema,
        },
      },
      description: "Bad Request",
    },
    401: {
      content: {
        "application/json": {
          schema: extensionNotAuthorizedSchema,
        },
      },
      description: "Unauthorized",
    },
    403: {
      content: {
        "application/json": {
          schema: extensionErrorSchema,
        },
      },
      description: "Forbidden",
    },
  },
});
