/**
 * Chat/Assistants API Routes
 * OpenAPI route definitions for AI chat and assistant operations
 */

import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import {
  assistantIdParamsSchema,
  assistantResponseSchema,
  conversationIdParamsSchema,
  conversationResponseSchema,
  createAssistantBodySchema,
  createConversationBodySchema,
  createConversationResponseSchema,
  deleteResponseSchema,
  errorSchema,
  listAssistantsQuerySchema,
  listAssistantsResponseSchema,
  listConversationsQuerySchema,
  listConversationsResponseSchema,
  messageFeedbackBodySchema,
  sendMessageBodySchema,
  sendMessageResponseSchema,
  updateAssistantBodySchema,
} from "./chat.schema";

const conversationTags = ["Conversations"];
const assistantTags = ["Assistants"];

// ============================================================================
// Conversation Routes
// ============================================================================

export const listConversations = createRoute({
  tags: conversationTags,
  method: "get",
  path: "/conversations",
  summary: "List conversations",
  description: "Retrieve a paginated list of the user's conversations",
  request: {
    query: listConversationsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: listConversationsResponseSchema },
      },
      description: "Conversations retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
  },
});

export const createConversation = createRoute({
  tags: conversationTags,
  method: "post",
  path: "/conversations",
  summary: "Start a conversation",
  description: "Start a new conversation with an optional assistant",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createConversationBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: createConversationResponseSchema },
      },
      description: "Conversation started successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const getConversation = createRoute({
  tags: conversationTags,
  method: "get",
  path: "/conversations/{conversationId}",
  summary: "Get conversation",
  description: "Retrieve a specific conversation with all messages",
  request: {
    params: conversationIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: conversationResponseSchema } },
      description: "Conversation retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Conversation not found",
    },
  },
});

export const sendMessage = createRoute({
  tags: conversationTags,
  method: "post",
  path: "/conversations/{conversationId}/messages",
  summary: "Send message",
  description: "Send a message in a conversation and get the AI response",
  request: {
    params: conversationIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: sendMessageBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: sendMessageResponseSchema } },
      description: "Message sent and response received",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Conversation not found",
    },
  },
});

export const provideFeedback = createRoute({
  tags: conversationTags,
  method: "post",
  path: "/conversations/{conversationId}/messages/{messageId}/feedback",
  summary: "Provide message feedback",
  description: "Provide feedback on an AI message (helpful/not helpful)",
  request: {
    params: conversationIdParamsSchema.extend({
      messageId: z.string().openapi({
        param: {
          name: "messageId",
          in: "path",
        },
        description: "Message identifier",
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: messageFeedbackBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Feedback recorded successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Message not found",
    },
  },
});

export const deleteConversation = createRoute({
  tags: conversationTags,
  method: "delete",
  path: "/conversations/{conversationId}",
  summary: "Delete conversation",
  description: "Delete a conversation and all its messages",
  request: {
    params: conversationIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Conversation deleted successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Conversation not found",
    },
  },
});

// ============================================================================
// Assistant Routes
// ============================================================================

export const listAssistants = createRoute({
  tags: assistantTags,
  method: "get",
  path: "/assistants",
  summary: "List assistants",
  description: "Retrieve available AI assistants",
  request: {
    query: listAssistantsQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: listAssistantsResponseSchema } },
      description: "Assistants retrieved successfully",
    },
  },
});

export const createAssistant = createRoute({
  tags: assistantTags,
  method: "post",
  path: "/assistants",
  summary: "Create assistant",
  description: "Create a new custom AI assistant",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createAssistantBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: assistantResponseSchema } },
      description: "Assistant created successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const getAssistant = createRoute({
  tags: assistantTags,
  method: "get",
  path: "/assistants/{assistantId}",
  summary: "Get assistant",
  description: "Retrieve a specific assistant's details",
  request: {
    params: assistantIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: assistantResponseSchema } },
      description: "Assistant retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Assistant not found",
    },
  },
});

export const updateAssistant = createRoute({
  tags: assistantTags,
  method: "patch",
  path: "/assistants/{assistantId}",
  summary: "Update assistant",
  description: "Update an assistant's configuration",
  request: {
    params: assistantIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateAssistantBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: assistantResponseSchema } },
      description: "Assistant updated successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Assistant not found",
    },
  },
});

export const deleteAssistant = createRoute({
  tags: assistantTags,
  method: "delete",
  path: "/assistants/{assistantId}",
  summary: "Delete assistant",
  description: "Delete a custom assistant",
  request: {
    params: assistantIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "Assistant deleted successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Assistant not found",
    },
  },
});
