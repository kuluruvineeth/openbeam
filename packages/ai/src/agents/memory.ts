/**
 * Agent Memory System
 *
 * Database-backed memory with Redis caching for fast access.
 * Supports conversation persistence, semantic search, and context management.
 *
 * Architecture:
 * - Primary storage: PostgreSQL via @openplane/db
 * - Cache layer: Redis via @openplane/redis (contextCache)
 * - Semantic search: Vespa via @openplane/vespa
 */

import type { IAgentMemory, MemoryEntry } from "./types";

/**
 * Memory configuration options
 */
export interface MemoryConfig {
  /** Maximum entries to keep in active memory */
  maxEntries: number;
  /** Maximum tokens to keep in context window */
  maxTokens: number;
  /** Enable Redis caching for fast access */
  enableCache: boolean;
  /** Cache TTL in seconds */
  cacheTTL: number;
  /** Enable semantic search for memory retrieval */
  enableSemanticSearch: boolean;
}

const DEFAULT_CONFIG: MemoryConfig = {
  maxEntries: 50,
  maxTokens: 8000,
  enableCache: true,
  cacheTTL: 86_400, // 24 hours
  enableSemanticSearch: true,
};

/**
 * Estimate tokens in text (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Agent Memory Implementation
 *
 * Provides persistent memory storage backed by:
 * - PostgreSQL for durable storage
 * - Redis for fast cache access
 * - Vespa for semantic search (optional)
 */
export class AgentMemory implements IAgentMemory {
  private readonly conversationId: string;
  private readonly teamId: string;
  private readonly userId: string;
  private readonly config: MemoryConfig;
  private tokenLimit: number;

  constructor(
    conversationId: string,
    teamId: string,
    userId: string,
    config: Partial<MemoryConfig> = {}
  ) {
    this.conversationId = conversationId;
    this.teamId = teamId;
    this.userId = userId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tokenLimit = this.config.maxTokens;
  }

  /**
   * Add an entry to memory (persists to database and cache)
   */
  async add(entry: MemoryEntry): Promise<void> {
    try {
      // Persist to database
      const { addMessage } = await import("@openplane/db");
      const prisma = (await import("@openplane/db")).default;

      await addMessage(prisma, {
        conversationId: this.conversationId,
        role: entry.role.toUpperCase(),
        content: entry.content,
        metadata: entry.metadata || {},
        tokensUsed: estimateTokens(entry.content),
      });

      // Update Redis cache
      if (this.config.enableCache) {
        try {
          const { contextCache } = await import("@openplane/redis");
          await contextCache.appendMessage(this.conversationId, {
            role: entry.role,
            content: entry.content,
          });
        } catch (cacheError) {
          // Cache failure shouldn't fail the operation
          console.warn("Memory cache update failed:", cacheError);
        }
      }
    } catch (error) {
      console.error("Memory add failed:", error);
      throw error;
    }
  }

  /**
   * Get recent entries from memory
   */
  async getRecent(count: number): Promise<MemoryEntry[]> {
    // Try cache first for speed
    if (this.config.enableCache) {
      try {
        const { contextCache } = await import("@openplane/redis");
        const cached = await contextCache.getRecentMessages(
          this.conversationId,
          count
        );

        if (cached.length > 0) {
          return cached.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }));
        }
      } catch {
        // Cache miss, fall through to database
      }
    }

    // Fetch from database
    try {
      const { getConversationMessages } = await import("@openplane/db");
      const prisma = (await import("@openplane/db")).default;

      const result = await getConversationMessages(
        prisma,
        this.conversationId,
        {
          limit: count,
          order: "desc",
        }
      );

      // Reverse to get chronological order
      const messages = result.messages.reverse();

      return messages.map((msg) => ({
        role: msg.role.toLowerCase() as MemoryEntry["role"],
        content: msg.content,
        timestamp: msg.createdAt.getTime(),
        metadata: msg.metadata,
      }));
    } catch (error) {
      console.error("Memory getRecent failed:", error);
      return [];
    }
  }

  /**
   * Get all entries from memory
   */
  async getAll(): Promise<MemoryEntry[]> {
    return this.getRecent(this.config.maxEntries);
  }

  /**
   * Clear memory (archives the conversation)
   */
  async clear(): Promise<void> {
    try {
      const { archiveConversation } = await import("@openplane/db");
      const prisma = (await import("@openplane/db")).default;

      await archiveConversation(prisma, this.conversationId);

      // Clear cache
      if (this.config.enableCache) {
        try {
          const { contextCache } = await import("@openplane/redis");
          await contextCache.deleteConversation(this.conversationId);
        } catch {
          // Ignore cache clear errors
        }
      }
    } catch (error) {
      console.error("Memory clear failed:", error);
      throw error;
    }
  }

  /**
   * Get summary of memory content
   */
  async getSummary(): Promise<string> {
    const entries = await this.getRecent(10);
    if (entries.length === 0) {
      return "No conversation history.";
    }

    const summary = entries
      .map((e) => `${e.role}: ${e.content.slice(0, 100)}...`)
      .join("\n");

    return `Conversation summary (${entries.length} messages):\n${summary}`;
  }

  /**
   * Get token count of current memory
   */
  async getTokenCount(): Promise<number> {
    const entries = await this.getAll();
    return entries.reduce((sum, e) => sum + estimateTokens(e.content), 0);
  }

  /**
   * Trim memory to fit within token limit
   */
  async trimToTokens(maxTokens: number): Promise<void> {
    this.tokenLimit = maxTokens;
    // Note: This affects read-time filtering, not actual storage
  }

  /**
   * Format memory as messages for LLM
   */
  async toMessages(): Promise<
    Array<{ role: "user" | "assistant" | "system"; content: string }>
  > {
    const entries = await this.getAll();
    let tokenCount = 0;

    // Filter entries that fit within token limit
    const filteredEntries = entries.filter((entry) => {
      const entryTokens = estimateTokens(entry.content);
      if (tokenCount + entryTokens <= this.tokenLimit) {
        tokenCount += entryTokens;
        return true;
      }
      return false;
    });

    return filteredEntries.map((e) => ({
      role: e.role,
      content: e.content,
    }));
  }

  /**
   * Format memory as context string
   */
  async toContext(): Promise<string> {
    const messages = await this.toMessages();
    return messages.map((m) => `[${m.role}]: ${m.content}`).join("\n\n");
  }

  /**
   * Get the last user message
   */
  async getLastUserMessage(): Promise<MemoryEntry | undefined> {
    const entries = await this.getRecent(20);
    return entries.reverse().find((e) => e.role === "user");
  }

  /**
   * Get the last assistant message
   */
  async getLastAssistantMessage(): Promise<MemoryEntry | undefined> {
    const entries = await this.getRecent(20);
    return entries.reverse().find((e) => e.role === "assistant");
  }

  /**
   * Search memory for relevant entries using semantic search
   */
  async search(query: string, limit = 5): Promise<MemoryEntry[]> {
    if (!this.config.enableSemanticSearch) {
      // Fall back to simple text search
      const entries = await this.getAll();
      const queryLower = query.toLowerCase();
      return entries
        .filter((e) => e.content.toLowerCase().includes(queryLower))
        .slice(0, limit);
    }

    // Use Vespa for semantic search if available
    try {
      const { searchService } = await import("@openplane/vespa");
      const { embeddingService } = await import("../embeddings");

      // Embed the query
      const queryEmbedding = await embeddingService.embedQuery(query);

      // Search for relevant documents
      const results = await searchService.hybridSearch(
        query,
        queryEmbedding,
        this.teamId,
        { limit }
      );

      // Note: This searches all documents, not just conversation messages
      // For conversation-specific search, you'd need a separate Vespa schema

      return results.items.map((hit) => ({
        role: "assistant" as const,
        content: hit.fields.content || "",
        timestamp: hit.fields.created_at || Date.now(),
        metadata: { documentId: hit.fields.id },
      }));
    } catch (error) {
      console.warn("Semantic search failed, using text search:", error);
      const entries = await this.getAll();
      const queryLower = query.toLowerCase();
      return entries
        .filter((e) => e.content.toLowerCase().includes(queryLower))
        .slice(0, limit);
    }
  }

  /**
   * Get entry count
   */
  async getEntryCount(): Promise<number> {
    try {
      const { getConversationMessages } = await import("@openplane/db");
      const prisma = (await import("@openplane/db")).default;

      const result = await getConversationMessages(
        prisma,
        this.conversationId,
        { limit: 1 }
      );

      return result.total;
    } catch {
      return 0;
    }
  }
}

/**
 * Create a new memory instance for an agent
 */
export function createMemory(
  conversationId: string,
  teamId: string,
  userId: string,
  config?: Partial<MemoryConfig>
): IAgentMemory {
  return new AgentMemory(conversationId, teamId, userId, config);
}

/**
 * Create or get memory for a conversation
 * Creates the conversation if it doesn't exist
 */
export async function getOrCreateMemory(
  teamId: string,
  userId: string,
  conversationId?: string,
  config?: Partial<MemoryConfig>
): Promise<{ memory: IAgentMemory; conversationId: string }> {
  let convId = conversationId;

  if (!convId) {
    // Create new conversation
    const { createConversation } = await import("@openplane/db");
    const prisma = (await import("@openplane/db")).default;

    convId = await createConversation(prisma, {
      teamId,
      userId,
    });
  }

  // convId is guaranteed to be defined here
  const finalConvId = convId as string;

  return {
    memory: createMemory(finalConvId, teamId, userId, config),
    conversationId: finalConvId,
  };
}

export default AgentMemory;
