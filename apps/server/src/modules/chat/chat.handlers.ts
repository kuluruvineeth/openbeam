/**
 * Chat/Assistants API Handlers
 * Request handlers for AI chat and assistant operations
 */

import type { RouteHandler } from "@hono/zod-openapi";
import * as response from "@/lib/response";
import { type AuthEnv, getTeamId } from "@/middleware/auth";
import { getAccessControlIds } from "@/types/auth";
import type {
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
import { chatService } from "./chat.service";

// ============================================================================
// Conversation Handlers
// ============================================================================

export const listConversationsHandler: RouteHandler<
  typeof listConversations,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const { conversations, total } = await chatService.listConversations(
    teamId,
    userId,
    {
      assistantId: query.assistant_id,
      limit: query.limit,
      offset: query.offset,
    }
  );

  const page = Math.floor(query.offset / query.limit) + 1;

  return response.paginated(c, conversations, {
    page,
    pageSize: query.limit,
    total,
  });
};

export const createConversationHandler: RouteHandler<
  typeof createConversation,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;
  const accessControlIds = getAccessControlIds(authContext);

  const result = await chatService.createConversation({
    teamId,
    userId,
    assistantId: body.assistantId,
    title: body.title,
    message: body.message,
    accessControlIds,
  });

  return response.success(
    c,
    {
      conversation: result.conversation,
      message: result.userMessage,
      response: result.assistantMessage,
    },
    201
  );
};

export const getConversationHandler: RouteHandler<
  typeof getConversation,
  AuthEnv
> = async (c) => {
  const { conversationId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const conversation = await chatService.getConversation(
    conversationId,
    teamId,
    userId
  );

  if (!conversation) {
    return response.notFound(c, "Conversation", conversationId);
  }

  return response.success(c, conversation);
};

export const sendMessageHandler: RouteHandler<
  typeof sendMessage,
  AuthEnv
> = async (c) => {
  const { conversationId } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;
  const accessControlIds = getAccessControlIds(authContext);

  const result = await chatService.sendMessage({
    conversationId,
    teamId,
    userId,
    content: body.content,
    accessControlIds,
  });

  if (!result) {
    return response.notFound(c, "Conversation", conversationId);
  }

  return response.success(c, {
    message: result.userMessage,
    response: result.assistantMessage,
  });
};

export const provideFeedbackHandler: RouteHandler<
  typeof provideFeedback,
  AuthEnv
> = (c) => {
  // const { conversationId, messageId } = c.req.valid("param");
  // const body = c.req.valid("json");

  // TODO: Implement feedback storage

  return response.success(c, {
    message: "Feedback recorded successfully",
  });
};

export const deleteConversationHandler: RouteHandler<
  typeof deleteConversation,
  AuthEnv
> = async (c) => {
  const { conversationId } = c.req.valid("param");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const deleted = await chatService.deleteConversation(
    conversationId,
    teamId,
    userId
  );

  if (!deleted) {
    return response.notFound(c, "Conversation", conversationId);
  }

  return response.success(c, {
    message: "Conversation deleted successfully",
  });
};

// ============================================================================
// Assistant Handlers
// ============================================================================

export const listAssistantsHandler: RouteHandler<
  typeof listAssistants,
  AuthEnv
> = async (c) => {
  const query = c.req.valid("query");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const { assistants, total } = await chatService.listAssistants(
    teamId,
    query.visibility,
    query.limit,
    query.offset
  );

  const page = Math.floor(query.offset / query.limit) + 1;

  return response.paginated(c, assistants, {
    page,
    pageSize: query.limit,
    total,
  });
};

export const createAssistantHandler: RouteHandler<
  typeof createAssistant,
  AuthEnv
> = async (c) => {
  const body = c.req.valid("json");
  const teamId = getTeamId(c);
  const authContext = c.get("authContext");

  if (!teamId || authContext.type !== "session") {
    return response.badRequest(c, "Session authentication required");
  }

  const userId = authContext.userId;

  const assistant = await chatService.createAssistant(teamId, userId, {
    name: body.name,
    description: body.description,
    systemPrompt: body.systemPrompt,
    personality: body.personality,
    instructions: body.instructions,
    connectorIds: body.connectorIds,
    documentTypes: body.documentTypes,
    modelConfig: body.modelConfig,
    examplePrompts: body.examplePrompts,
    visibility: body.visibility,
    avatar: body.avatar,
  });

  return response.success(c, assistant, 201);
};

export const getAssistantHandler: RouteHandler<
  typeof getAssistant,
  AuthEnv
> = async (c) => {
  const { assistantId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const assistant = await chatService.getAssistant(assistantId, teamId);

  if (!assistant) {
    return response.notFound(c, "Assistant", assistantId);
  }

  return response.success(c, assistant);
};

export const updateAssistantHandler: RouteHandler<
  typeof updateAssistant,
  AuthEnv
> = async (c) => {
  const { assistantId } = c.req.valid("param");
  const body = c.req.valid("json");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const assistant = await chatService.updateAssistant(
    assistantId,
    teamId,
    body
  );

  if (!assistant) {
    return response.notFound(c, "Assistant", assistantId);
  }

  return response.success(c, assistant);
};

export const deleteAssistantHandler: RouteHandler<
  typeof deleteAssistant,
  AuthEnv
> = async (c) => {
  const { assistantId } = c.req.valid("param");
  const teamId = getTeamId(c);

  if (!teamId) {
    return response.badRequest(c, "Team ID is required");
  }

  const deleted = await chatService.deleteAssistant(assistantId, teamId);

  if (!deleted) {
    return response.notFound(c, "Assistant", assistantId);
  }

  return response.success(c, {
    message: "Assistant deleted successfully",
  });
};
