import { createRoute } from "@hono/zod-openapi";
import {
  askBodySchema,
  askResponseSchema,
  conversationIdParamsSchema,
  conversationListQuerySchema,
  createConversationResponseSchema,
  errorSchema,
  streamBodySchema,
  successSchema,
} from "./rag.schema";

const tags = ["RAG"];

export const askRoute = createRoute({
  tags,
  method: "post",
  path: "/ask",
  summary: "Ask RAG",
  request: {
    body: {
      content: {
        "application/json": {
          schema: askBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: askResponseSchema,
        },
      },
      description: "Answer generated",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

export const streamRoute = createRoute({
  tags,
  method: "post",
  path: "/stream",
  summary: "Stream RAG answer",
  request: {
    body: {
      content: {
        "application/json": {
          schema: streamBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Streaming started",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

export const createConversationRoute = createRoute({
  tags,
  method: "post",
  path: "/conversations",
  summary: "Create conversation",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: createConversationResponseSchema,
        },
      },
      description: "Conversation created",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

export const listConversationsRoute = createRoute({
  tags,
  method: "get",
  path: "/conversations",
  summary: "List conversations",
  request: {
    query: conversationListQuerySchema,
  },
  responses: {
    200: {
      description: "Conversations listed",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

export const getConversationRoute = createRoute({
  tags,
  method: "get",
  path: "/conversations/{id}",
  summary: "Get conversation",
  request: {
    params: conversationIdParamsSchema,
  },
  responses: {
    200: {
      description: "Conversation fetched",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Not found",
    },
  },
});

export const deleteConversationRoute = createRoute({
  tags,
  method: "delete",
  path: "/conversations/{id}",
  summary: "Delete conversation",
  request: {
    params: conversationIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Conversation deleted",
    },
    401: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Unauthorized",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Not found",
    },
  },
});
