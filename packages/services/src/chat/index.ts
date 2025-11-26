/**
 * Chat Service
 * Business logic for AI conversations and messaging
 *
 * Uses @openplane/db for conversation/message persistence.
 * Uses @openplane/ai for RAG-powered response generation.
 */

import prisma, {
  addMessage,
  archiveConversation,
  createConversation as dbCreateConversation,
  deleteConversation as dbDeleteConversation,
  getConversation as dbGetConversation,
  getConversationMessages,
  getUserConversations,
  updateConversationTitle,
} from "@openplane/db";
import type {
  ChatMessage,
  Citation,
  ConversationDetail,
  ConversationSummary,
} from "../types";

// ============================================================================
// Types
// ============================================================================

export interface ListConversationsOptions {
  assistantId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateConversationParams {
  teamId: string;
  userId: string;
  assistantId?: string;
  title?: string;
  message: string;
  accessControlIds?: string[];
}

export interface SendMessageParams {
  conversationId: string;
  teamId: string;
  userId: string;
  content: string;
  accessControlIds?: string[];
}

// ============================================================================
// Chat Service Functions
// ============================================================================

/**
 * List user's conversations
 */
export async function listConversations(
  teamId: string,
  userId: string,
  options: ListConversationsOptions = {}
): Promise<{ conversations: ConversationSummary[]; total: number }> {
  const { assistantId, limit = 20, offset = 0 } = options;

  const result = await getUserConversations(prisma, teamId, userId, {
    limit,
    offset,
    includeArchived: false,
  });

  // Filter by assistantId if provided
  let filteredConversations = result.conversations;
  if (assistantId) {
    filteredConversations = result.conversations.filter(
      (c) => c.assistantId === assistantId
    );
  }

  return {
    conversations: filteredConversations.map((c) => ({
      id: c.id,
      title: c.title || undefined,
      assistantId: c.assistantId || undefined,
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
    })),
    total: assistantId ? filteredConversations.length : result.total,
  };
}

/**
 * Get a conversation with messages
 */
export async function getConversation(
  conversationId: string,
  teamId: string,
  userId: string
): Promise<ConversationDetail | null> {
  const conversation = await dbGetConversation(prisma, conversationId);

  if (!conversation) {
    return null;
  }

  // Verify ownership
  if (conversation.teamId !== teamId || conversation.userId !== userId) {
    return null;
  }

  // Get messages
  const messagesResult = await getConversationMessages(prisma, conversationId, {
    limit: 100,
    order: "asc",
  });

  return {
    id: conversation.id,
    title: conversation.title || undefined,
    assistantId: conversation.assistantId || undefined,
    messageCount: conversation.messageCount,
    lastMessageAt: conversation.lastMessageAt?.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    messages: messagesResult.messages.map((m) => mapMessage(m)),
  };
}

/**
 * Create a new conversation with initial message
 */
export async function createConversation(
  params: CreateConversationParams
): Promise<{
  conversation: ConversationSummary;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}> {
  const title = params.title || generateTitle(params.message);

  // Create conversation
  const conversationId = await dbCreateConversation(prisma, {
    teamId: params.teamId,
    userId: params.userId,
    assistantId: params.assistantId,
    title,
  });

  // Add user message
  const userMessageId = await addMessage(prisma, {
    conversationId,
    role: "USER",
    content: params.message,
  });

  // Generate AI response
  const response = await generateResponse(
    params.message,
    params.teamId,
    params.accessControlIds
  );

  // Add assistant message
  const assistantMessageId = await addMessage(prisma, {
    conversationId,
    role: "ASSISTANT",
    content: response.content,
    citations: response.citations as unknown as Record<string, unknown>[],
  });

  const now = new Date();

  return {
    conversation: {
      id: conversationId,
      title,
      assistantId: params.assistantId,
      messageCount: 2,
      lastMessageAt: now.toISOString(),
      createdAt: now.toISOString(),
    },
    userMessage: {
      id: userMessageId,
      role: "user",
      content: params.message,
      contentType: "text",
      createdAt: now.toISOString(),
    },
    assistantMessage: {
      id: assistantMessageId,
      role: "assistant",
      content: response.content,
      contentType: "markdown",
      citations: response.citations,
      createdAt: now.toISOString(),
    },
  };
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(params: SendMessageParams): Promise<{
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
} | null> {
  // Verify conversation exists and belongs to user
  const conversation = await dbGetConversation(prisma, params.conversationId);

  if (!conversation) {
    return null;
  }

  if (
    conversation.teamId !== params.teamId ||
    conversation.userId !== params.userId
  ) {
    return null;
  }

  // Add user message
  const userMessageId = await addMessage(prisma, {
    conversationId: params.conversationId,
    role: "USER",
    content: params.content,
  });

  // Generate AI response
  const response = await generateResponse(
    params.content,
    params.teamId,
    params.accessControlIds
  );

  // Add assistant message
  const assistantMessageId = await addMessage(prisma, {
    conversationId: params.conversationId,
    role: "ASSISTANT",
    content: response.content,
    citations: response.citations as unknown as Record<string, unknown>[],
  });

  const now = new Date();

  return {
    userMessage: {
      id: userMessageId,
      role: "user",
      content: params.content,
      contentType: "text",
      createdAt: now.toISOString(),
    },
    assistantMessage: {
      id: assistantMessageId,
      role: "assistant",
      content: response.content,
      contentType: "markdown",
      citations: response.citations,
      createdAt: now.toISOString(),
    },
  };
}

/**
 * Update conversation title
 */
export async function updateTitle(
  conversationId: string,
  teamId: string,
  userId: string,
  title: string
): Promise<boolean> {
  const conversation = await dbGetConversation(prisma, conversationId);
  if (!conversation) {
    return false;
  }
  if (conversation.teamId !== teamId || conversation.userId !== userId) {
    return false;
  }

  await updateConversationTitle(prisma, conversationId, title);
  return true;
}

/**
 * Archive a conversation
 */
export async function archiveConversationById(
  conversationId: string,
  teamId: string,
  userId: string
): Promise<boolean> {
  const conversation = await dbGetConversation(prisma, conversationId);
  if (!conversation) {
    return false;
  }
  if (conversation.teamId !== teamId || conversation.userId !== userId) {
    return false;
  }

  await archiveConversation(prisma, conversationId);
  return true;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  conversationId: string,
  teamId: string,
  userId: string
): Promise<boolean> {
  const conversation = await dbGetConversation(prisma, conversationId);
  if (!conversation) {
    return false;
  }
  if (conversation.teamId !== teamId || conversation.userId !== userId) {
    return false;
  }

  await dbDeleteConversation(prisma, conversationId);
  return true;
}

// ============================================================================
// Private Helpers
// ============================================================================

async function generateResponse(
  query: string,
  teamId: string,
  accessControlIds?: string[]
): Promise<{ content: string; citations: Citation[] }> {
  try {
    // Use RAG pipeline from @openplane/ai for AI-powered response
    const { ragPipeline } = await import("@openplane/ai");

    const result = await ragPipeline.answer(query, teamId, {
      accessControl: accessControlIds,
      retrieval: {
        topK: 5,
        minScore: 0.3,
      },
      maxTokens: 2000,
    });

    // Map AI citations to service citations
    const citations: Citation[] = result.citations.map(
      (c: {
        documentId: string;
        title: string;
        url?: string;
        snippet?: string;
        relevanceScore?: number;
      }) => ({
        documentId: c.documentId,
        title: c.title,
        url: c.url,
        snippet: c.snippet || "",
        relevanceScore: c.relevanceScore || 0,
      })
    );

    return {
      content: result.answer,
      citations,
    };
  } catch (error) {
    console.error("RAG pipeline error, falling back to search-only:", error);

    // Fallback to basic search if RAG fails
    const { search } = await import("../search");
    const searchResult = await search({
      query,
      teamId,
      accessControlIds,
      limit: 5,
      offset: 0,
      ranking: "hybrid",
    });

    const citations: Citation[] = searchResult.documents.map((doc) => ({
      documentId: doc.id,
      title: doc.title,
      url: doc.url,
      snippet: doc.snippet || "",
      relevanceScore: doc.relevanceScore || 0,
    }));

    const content =
      `I found some relevant documents for "${query}":\n\n` +
      searchResult.documents
        .slice(0, 3)
        .map(
          (doc, i) =>
            `${i + 1}. **${doc.title}**: ${doc.snippet || "No preview available"}`
        )
        .join("\n\n");

    return { content, citations };
  }
}

function generateTitle(message: string): string {
  const words = message.split(" ").slice(0, 5);
  return words.join(" ") + (message.split(" ").length > 5 ? "..." : "");
}

function mapMessage(message: {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
  citations: Record<string, unknown>[];
  toolCalls: Record<string, unknown>[];
  tokensUsed: number | null;
  createdAt: Date;
}): ChatMessage {
  return {
    id: message.id,
    role: message.role.toLowerCase() as ChatMessage["role"],
    content: message.content,
    contentType: "text",
    citations: message.citations as unknown as Citation[] | undefined,
    toolCalls: message.toolCalls as unknown as ChatMessage["toolCalls"],
    createdAt: message.createdAt.toISOString(),
  };
}

// ============================================================================
// Re-export types
// ============================================================================

export type {
  ChatMessage,
  Citation,
  ConversationDetail,
  ConversationSummary,
} from "../types";
