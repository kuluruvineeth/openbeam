/**
 * Chat/Assistants Service
 * Business logic for AI chat and assistant operations
 *
 * Uses @openplane/db queries/mutations for centralized database access.
 */

import prisma, {
  // AI Mutations
  addMessage,
  archiveConversation,
  createConversation as dbCreateConversation,
  deleteConversation as dbDeleteConversation,
  // AI Queries
  getAssistant as dbGetAssistant,
  getConversation as dbGetConversation,
  getConversationMessages,
  getUserConversations,
  updateConversationTitle,
} from "@openplane/db";
import { searchService } from "@/modules/search/search.service";
import type {
  AssistantDetail,
  AssistantSummary,
  ChatMessage,
  Citation,
  ConversationDetail,
  ConversationSummary,
} from "@/types/api";

// ============================================================================
// Types
// ============================================================================

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
// Service Class
// ============================================================================

export class ChatService {
  /**
   * List user's conversations
   * Uses @db getUserConversations query
   */
  async listConversations(
    teamId: string,
    userId: string,
    options: { assistantId?: string; limit?: number; offset?: number } = {}
  ): Promise<{ conversations: ConversationSummary[]; total: number }> {
    const { assistantId, limit = 20, offset = 0 } = options;
    const result = await getUserConversations(prisma, teamId, userId, {
      limit,
      offset,
      includeArchived: false,
    });

    // Filter by assistantId if provided (in memory for now)
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
   * Uses @db getConversation and getConversationMessages queries
   */
  async getConversation(
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
    const messagesResult = await getConversationMessages(
      prisma,
      conversationId,
      { limit: 100, order: "asc" }
    );

    return {
      id: conversation.id,
      title: conversation.title || undefined,
      assistantId: conversation.assistantId || undefined,
      messageCount: conversation.messageCount,
      lastMessageAt: conversation.lastMessageAt?.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      messages: messagesResult.messages.map((m) => this.mapMessage(m)),
    };
  }

  /**
   * Create a new conversation with initial message
   * Uses @db createConversation and addMessage mutations
   */
  async createConversation(params: CreateConversationParams): Promise<{
    conversation: ConversationSummary;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
  }> {
    const title = params.title || this.generateTitle(params.message);

    // Create conversation using @db mutation
    const conversationId = await dbCreateConversation(prisma, {
      teamId: params.teamId,
      userId: params.userId,
      assistantId: params.assistantId,
      title,
    });

    // Add user message using @db mutation
    const userMessageId = await addMessage(prisma, {
      conversationId,
      role: "USER",
      content: params.message,
    });

    // Generate AI response
    const response = await this.generateResponse(
      params.message,
      params.teamId,
      params.assistantId,
      params.accessControlIds
    );

    // Add assistant message using @db mutation
    const assistantMessageId = await addMessage(prisma, {
      conversationId,
      role: "ASSISTANT",
      content: response.content,
      citations: response.citations,
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
   * Uses @db getConversation and addMessage
   */
  async sendMessage(params: SendMessageParams): Promise<{
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

    // Add user message using @db mutation
    const userMessageId = await addMessage(prisma, {
      conversationId: params.conversationId,
      role: "USER",
      content: params.content,
    });

    // Generate AI response
    const response = await this.generateResponse(
      params.content,
      params.teamId,
      conversation.assistantId || undefined,
      params.accessControlIds
    );

    // Add assistant message using @db mutation
    const assistantMessageId = await addMessage(prisma, {
      conversationId: params.conversationId,
      role: "ASSISTANT",
      content: response.content,
      citations: response.citations,
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
   * Uses @db updateConversationTitle mutation
   */
  async updateConversationTitle(
    conversationId: string,
    teamId: string,
    userId: string,
    _title: string
  ): Promise<boolean> {
    // Verify ownership first
    const conversation = await dbGetConversation(prisma, conversationId);
    if (!conversation) {
      return false;
    }
    if (conversation.teamId !== teamId || conversation.userId !== userId) {
      return false;
    }

    await updateConversationTitle(prisma, conversationId, _title);
    return true;
  }

  /**
   * Archive a conversation (soft delete)
   * Uses @db archiveConversation mutation
   */
  async archiveConversationById(
    conversationId: string,
    teamId: string,
    userId: string
  ): Promise<boolean> {
    // Verify ownership first
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
   * Uses @db deleteConversation mutation
   */
  async deleteConversation(
    conversationId: string,
    teamId: string,
    userId: string
  ): Promise<boolean> {
    // Verify ownership first
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

  /**
   * List assistants
   * Uses raw prisma for now - TODO: add to @db queries
   */
  async listAssistants(
    teamId: string,
    visibility?: "private" | "team" | "public",
    limit = 20,
    offset = 0
  ): Promise<{ assistants: AssistantSummary[]; total: number }> {
    const visibilityMap = {
      private: "PRIVATE" as const,
      team: "TEAM" as const,
      public: "PUBLIC" as const,
    };

    const where = {
      teamId,
      isActive: true,
      ...(visibility && { visibility: visibilityMap[visibility] }),
    };

    const [assistants, total] = await Promise.all([
      prisma.assistant.findMany({
        where,
        orderBy: { usageCount: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.assistant.count({ where }),
    ]);

    return {
      assistants: assistants.map((a) => this.mapAssistantSummary(a)),
      total,
    };
  }

  /**
   * Get assistant by ID
   * Uses @db getAssistant query
   */
  async getAssistant(
    assistantId: string,
    teamId: string
  ): Promise<AssistantDetail | null> {
    const assistant = await dbGetAssistant(prisma, assistantId);

    if (!assistant) {
      return null;
    }

    // Verify team ownership
    if (assistant.teamId !== teamId) {
      return null;
    }

    // Map to AssistantDetail format
    return {
      id: assistant.id,
      name: assistant.name,
      slug: this.generateSlug(assistant.name),
      description: assistant.description || undefined,
      visibility: "private", // Default since not in query result
      capabilities: [],
      usageCount: 0,
      createdAt: new Date().toISOString(),
      systemPrompt: assistant.instructions,
      instructions: assistant.instructions,
      connectorIds: [],
      documentTypes: [],
      modelConfig: {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 4096,
      },
      examplePrompts: [],
    };
  }

  /**
   * Create an assistant
   * Uses raw prisma for now - TODO: add to @db mutations
   */
  async createAssistant(
    teamId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      systemPrompt: string;
      personality?: string;
      instructions?: string;
      connectorIds?: string[];
      documentTypes?: string[];
      modelConfig?: { model: string; temperature: number; maxTokens: number };
      examplePrompts?: string[];
      visibility?: "private" | "team" | "public";
      avatar?: string;
    }
  ): Promise<AssistantDetail> {
    const slug = this.generateSlug(data.name);

    const visibilityMap = {
      private: "PRIVATE" as const,
      team: "TEAM" as const,
      public: "PUBLIC" as const,
    };

    const assistant = await prisma.assistant.create({
      data: {
        teamId,
        createdBy: userId,
        name: data.name,
        slug,
        description: data.description,
        systemPrompt: data.systemPrompt,
        personality: data.personality,
        instructions: data.instructions,
        connectorIds: data.connectorIds || [],
        documentTypes: data.documentTypes || [],
        modelConfig: data.modelConfig || {
          model: "gpt-4",
          temperature: 0.7,
          maxTokens: 4096,
        },
        examplePrompts: data.examplePrompts || [],
        visibility: visibilityMap[data.visibility || "private"],
        avatar: data.avatar,
        isActive: true,
      },
    });

    return this.mapAssistantDetail(assistant);
  }

  /**
   * Update an assistant
   * Uses raw prisma for now - TODO: add to @db mutations
   */
  async updateAssistant(
    assistantId: string,
    teamId: string,
    data: Partial<{
      name: string;
      description: string;
      systemPrompt: string;
      personality: string;
      instructions: string;
      connectorIds: string[];
      documentTypes: string[];
      modelConfig: { model: string; temperature: number; maxTokens: number };
      examplePrompts: string[];
      visibility: "private" | "team" | "public";
      avatar: string;
    }>
  ): Promise<AssistantDetail | null> {
    const visibilityMap = {
      private: "PRIVATE" as const,
      team: "TEAM" as const,
      public: "PUBLIC" as const,
    };

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.systemPrompt !== undefined) {
      updateData.systemPrompt = data.systemPrompt;
    }
    if (data.personality !== undefined) {
      updateData.personality = data.personality;
    }
    if (data.instructions !== undefined) {
      updateData.instructions = data.instructions;
    }
    if (data.connectorIds !== undefined) {
      updateData.connectorIds = data.connectorIds;
    }
    if (data.documentTypes !== undefined) {
      updateData.documentTypes = data.documentTypes;
    }
    if (data.modelConfig !== undefined) {
      updateData.modelConfig = data.modelConfig;
    }
    if (data.examplePrompts !== undefined) {
      updateData.examplePrompts = data.examplePrompts;
    }
    if (data.visibility !== undefined) {
      updateData.visibility = visibilityMap[data.visibility];
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }

    const result = await prisma.assistant.updateMany({
      where: {
        id: assistantId,
        teamId,
      },
      data: updateData,
    });

    if (result.count === 0) {
      return null;
    }

    // Fetch updated assistant
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantId },
    });

    return assistant ? this.mapAssistantDetail(assistant) : null;
  }

  /**
   * Delete an assistant (soft delete)
   * Uses raw prisma for now - TODO: add to @db mutations
   */
  async deleteAssistant(assistantId: string, teamId: string): Promise<boolean> {
    const result = await prisma.assistant.updateMany({
      where: {
        id: assistantId,
        teamId,
      },
      data: {
        isActive: false,
      },
    });

    return result.count > 0;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async generateResponse(
    query: string,
    teamId: string,
    _assistantId?: string,
    accessControlIds?: string[]
  ): Promise<{ content: string; citations: Citation[] }> {
    // Search for relevant documents using our refactored searchService
    const searchResult = await searchService.search({
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

    // TODO: Integrate with LLM for actual response generation
    // For now, return a placeholder with citations
    const content =
      `Based on the relevant documents I found, here's what I can tell you about "${query}":\n\n` +
      searchResult.documents
        .slice(0, 3)
        .map(
          (doc, i) =>
            `${i + 1}. **${doc.title}**: ${doc.snippet || "No preview available"}`
        )
        .join("\n\n") +
      "\n\n*Note: Full AI-generated answers coming soon.*";

    return { content, citations };
  }

  private generateTitle(message: string): string {
    // Generate a title from the first message
    const words = message.split(" ").slice(0, 5);
    return words.join(" ") + (message.split(" ").length > 5 ? "..." : "");
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  private mapMessage(message: {
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
      citations: message.citations as Citation[] | undefined,
      toolCalls: message.toolCalls as ChatMessage["toolCalls"],
      createdAt: message.createdAt.toISOString(),
    };
  }

  private mapAssistantSummary(assistant: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    avatar?: string | null;
    visibility: string;
    capabilities?: unknown;
    usageCount: number;
    createdAt: Date;
  }): AssistantSummary {
    return {
      id: assistant.id,
      name: assistant.name,
      slug: assistant.slug,
      description: assistant.description || undefined,
      avatar: assistant.avatar || undefined,
      visibility:
        assistant.visibility.toLowerCase() as AssistantSummary["visibility"],
      capabilities: (assistant.capabilities as string[]) || [],
      usageCount: assistant.usageCount,
      createdAt: assistant.createdAt.toISOString(),
    };
  }

  private mapAssistantDetail(assistant: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    avatar?: string | null;
    visibility: string;
    capabilities?: unknown;
    usageCount: number;
    createdAt: Date;
    systemPrompt: string;
    personality?: string | null;
    instructions?: string | null;
    connectorIds: string[];
    documentTypes: string[];
    modelConfig?: unknown;
    examplePrompts?: unknown;
  }): AssistantDetail {
    const modelConfig =
      (assistant.modelConfig as {
        model?: string;
        temperature?: number;
        maxTokens?: number;
      }) || {};

    return {
      ...this.mapAssistantSummary(assistant),
      systemPrompt: assistant.systemPrompt,
      personality: assistant.personality || undefined,
      instructions: assistant.instructions || undefined,
      connectorIds: assistant.connectorIds,
      documentTypes: assistant.documentTypes,
      modelConfig: {
        model: modelConfig.model || "gpt-4",
        temperature: modelConfig.temperature ?? 0.7,
        maxTokens: modelConfig.maxTokens ?? 4096,
      },
      examplePrompts: (assistant.examplePrompts as string[]) || [],
    };
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const chatService = new ChatService();
