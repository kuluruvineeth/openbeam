/**
 * Chat/Assistants API Module
 * Entry point for AI chat and assistant operations
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/scopes";
import {
  createAssistantHandler,
  createConversationHandler,
  deleteAssistantHandler,
  deleteConversationHandler,
  getAssistantHandler,
  getConversationHandler,
  listAssistantsHandler,
  listConversationsHandler,
  provideFeedbackHandler,
  sendMessageHandler,
  updateAssistantHandler,
} from "./chat.handlers";
import {
  createAssistant,
  createConversation,
  deleteAssistant,
  deleteConversation,
  getAssistant,
  getConversation,
  listAssistants,
  listConversations,
  provideFeedback,
  sendMessage,
  updateAssistant,
} from "./chat.routes";

const chat = new OpenAPIHono<AuthEnv>();

// Apply auth middleware globally
chat.use("/*", requireAuth);

// ============================================================================
// Conversation Endpoints - require chat:read/write
// ============================================================================

// List conversations
chat.use("/conversations", requireScopes([API_SCOPES.CHAT_READ]));
chat.openapi(listConversations, listConversationsHandler);

// Create conversation
chat.use("/conversations", requireScopes([API_SCOPES.CHAT_WRITE]));
chat.openapi(createConversation, createConversationHandler);

// Get conversation
chat.use(
  "/conversations/:conversationId",
  requireScopes([API_SCOPES.CHAT_READ])
);
chat.openapi(getConversation, getConversationHandler);

// Send message
chat.use(
  "/conversations/:conversationId/messages",
  requireScopes([API_SCOPES.CHAT_WRITE])
);
chat.openapi(sendMessage, sendMessageHandler);

// Provide feedback
chat.openapi(provideFeedback, provideFeedbackHandler);

// Delete conversation
chat.openapi(deleteConversation, deleteConversationHandler);

// ============================================================================
// Assistant Endpoints - require assistants:read/write
// ============================================================================

// List assistants
chat.use("/assistants", requireScopes([API_SCOPES.ASSISTANTS_READ]));
chat.openapi(listAssistants, listAssistantsHandler);

// Create assistant
chat.use("/assistants", requireScopes([API_SCOPES.ASSISTANTS_WRITE]));
chat.openapi(createAssistant, createAssistantHandler);

// Get assistant
chat.use(
  "/assistants/:assistantId",
  requireScopes([API_SCOPES.ASSISTANTS_READ])
);
chat.openapi(getAssistant, getAssistantHandler);

// Update assistant
chat.use(
  "/assistants/:assistantId",
  requireScopes([API_SCOPES.ASSISTANTS_WRITE])
);
chat.openapi(updateAssistant, updateAssistantHandler);

// Delete assistant
chat.use(
  "/assistants/:assistantId",
  requireScopes([API_SCOPES.ASSISTANTS_DELETE])
);
chat.openapi(deleteAssistant, deleteAssistantHandler);

export default chat;
