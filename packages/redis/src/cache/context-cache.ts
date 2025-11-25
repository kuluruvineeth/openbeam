/**
 * Context Cache
 *
 * Caches AI context, embeddings, and conversation state for faster AI responses.
 * Supports the ContextCache model from ai.prisma.
 */
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

// === Types ===

export interface CachedContext {
  query: string;
  filters: Record<string, unknown>;
  results: ContextResult[];
  embedding?: number[];
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface ContextResult {
  documentId: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  conversationId: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
  }>;
  summary?: string;
  entities?: string[];
  topics?: string[];
  lastUpdated: number;
}

export interface EmbeddingCache {
  text: string;
  embedding: number[];
  model: string;
  createdAt: number;
}

// === Context Cache ===

export class ContextCache {
  private client: RedisClientType | null = null;
  private readonly CONTEXT_PREFIX = "ctx:";
  private readonly CONV_PREFIX = "conv:";
  private readonly EMB_PREFIX = "emb:";
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly CONV_TTL = 86_400; // 24 hours
  private readonly EMB_TTL = 604_800; // 7 days

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  /**
   * Generate cache key for context query
   */
  private generateContextKey(
    teamId: string,
    query: string,
    filters: Record<string, unknown>
  ): string {
    const hash = this.hashString(
      `${query}:${JSON.stringify(filters, Object.keys(filters).sort())}`
    );
    return `${this.CONTEXT_PREFIX}${teamId}:${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // === Context Caching ===

  /**
   * Get cached context for a query
   */
  async getContext(
    teamId: string,
    query: string,
    filters: Record<string, unknown>
  ): Promise<CachedContext | null> {
    const client = await this.getClient();
    const key = this.generateContextKey(teamId, query, filters);

    try {
      const data = await client.get(key);
      if (!data) return null;

      const context = JSON.parse(data) as CachedContext;

      // Check expiration
      if (context.expiresAt < Date.now()) {
        await client.del(key);
        return null;
      }

      // Increment hit count asynchronously
      context.hitCount++;
      client
        .set(key, JSON.stringify(context), { KEEPTTL: true })
        .catch((e) => console.error("Context hit count update failed:", e));

      return context;
    } catch (error) {
      console.error("Get context error:", error);
      return null;
    }
  }

  /**
   * Cache context for a query
   */
  async setContext(
    teamId: string,
    query: string,
    filters: Record<string, unknown>,
    results: ContextResult[],
    embedding?: number[],
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const client = await this.getClient();
    const key = this.generateContextKey(teamId, query, filters);

    const cacheData: CachedContext = {
      query,
      filters,
      results,
      embedding,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      hitCount: 0,
    };

    try {
      await client.set(key, JSON.stringify(cacheData), { EX: ttl });
    } catch (error) {
      console.error("Set context error:", error);
    }
  }

  /**
   * Invalidate context cache for a team
   */
  async invalidateTeamContext(teamId: string): Promise<number> {
    const client = await this.getClient();
    const pattern = `${this.CONTEXT_PREFIX}${teamId}:*`;

    try {
      let count = 0;
      const iterator = client.scanIterator({ MATCH: pattern, COUNT: 100 });

      for await (const key of iterator) {
        await client.del(String(key));
        count++;
      }

      return count;
    } catch (error) {
      console.error("Invalidate team context error:", error);
      return 0;
    }
  }

  // === Conversation Context ===

  /**
   * Get conversation context
   */
  async getConversation(
    conversationId: string
  ): Promise<ConversationContext | null> {
    const client = await this.getClient();
    const key = `${this.CONV_PREFIX}${conversationId}`;

    try {
      const data = await client.get(key);
      if (!data) return null;

      return JSON.parse(data) as ConversationContext;
    } catch (error) {
      console.error("Get conversation error:", error);
      return null;
    }
  }

  /**
   * Update conversation context
   */
  async updateConversation(
    context: ConversationContext,
    ttl: number = this.CONV_TTL
  ): Promise<void> {
    const client = await this.getClient();
    const key = `${this.CONV_PREFIX}${context.conversationId}`;

    context.lastUpdated = Date.now();

    try {
      await client.set(key, JSON.stringify(context), { EX: ttl });
    } catch (error) {
      console.error("Update conversation error:", error);
    }
  }

  /**
   * Append message to conversation
   */
  async appendMessage(
    conversationId: string,
    message: { role: "user" | "assistant" | "system"; content: string }
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId);

    if (conversation) {
      conversation.messages.push({
        ...message,
        timestamp: Date.now(),
      });

      // Keep only last 50 messages in cache (full history in DB)
      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }

      await this.updateConversation(conversation);
    } else {
      // Create new conversation context
      await this.updateConversation({
        conversationId,
        messages: [{ ...message, timestamp: Date.now() }],
        lastUpdated: Date.now(),
      });
    }
  }

  /**
   * Get last N messages from conversation
   */
  async getRecentMessages(
    conversationId: string,
    count = 10
  ): Promise<ConversationContext["messages"]> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return [];

    return conversation.messages.slice(-count);
  }

  /**
   * Delete conversation from cache
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`${this.CONV_PREFIX}${conversationId}`);
  }

  // === Embedding Cache ===

  /**
   * Get cached embedding for text
   */
  async getEmbedding(text: string, model: string): Promise<number[] | null> {
    const client = await this.getClient();
    const hash = this.hashString(`${model}:${text}`);
    const key = `${this.EMB_PREFIX}${hash}`;

    try {
      const data = await client.get(key);
      if (!data) return null;

      const cached = JSON.parse(data) as EmbeddingCache;
      return cached.embedding;
    } catch (error) {
      console.error("Get embedding error:", error);
      return null;
    }
  }

  /**
   * Cache embedding for text
   */
  async setEmbedding(
    text: string,
    model: string,
    embedding: number[],
    ttl: number = this.EMB_TTL
  ): Promise<void> {
    const client = await this.getClient();
    const hash = this.hashString(`${model}:${text}`);
    const key = `${this.EMB_PREFIX}${hash}`;

    const cacheData: EmbeddingCache = {
      text,
      embedding,
      model,
      createdAt: Date.now(),
    };

    try {
      await client.set(key, JSON.stringify(cacheData), { EX: ttl });
    } catch (error) {
      console.error("Set embedding error:", error);
    }
  }

  /**
   * Batch get embeddings
   */
  async getEmbeddingsBatch(
    texts: string[],
    model: string
  ): Promise<Map<string, number[]>> {
    const client = await this.getClient();
    const result = new Map<string, number[]>();

    try {
      const keys = texts.map((text) => {
        const hash = this.hashString(`${model}:${text}`);
        return `${this.EMB_PREFIX}${hash}`;
      });

      const values = await client.mGet(keys);

      for (let i = 0; i < texts.length; i++) {
        const value = values[i];
        if (value) {
          const cached = JSON.parse(value) as EmbeddingCache;
          result.set(texts[i]!, cached.embedding);
        }
      }
    } catch (error) {
      console.error("Get embeddings batch error:", error);
    }

    return result;
  }

  /**
   * Batch set embeddings
   */
  async setEmbeddingsBatch(
    embeddings: Array<{ text: string; model: string; embedding: number[] }>,
    ttl: number = this.EMB_TTL
  ): Promise<void> {
    const client = await this.getClient();

    try {
      const multi = client.multi();

      for (const { text, model, embedding } of embeddings) {
        const hash = this.hashString(`${model}:${text}`);
        const key = `${this.EMB_PREFIX}${hash}`;

        const cacheData: EmbeddingCache = {
          text,
          embedding,
          model,
          createdAt: Date.now(),
        };

        multi.set(key, JSON.stringify(cacheData), { EX: ttl });
      }

      await multi.exec();
    } catch (error) {
      console.error("Set embeddings batch error:", error);
    }
  }
}

// Export singleton
export const contextCache = new ContextCache();
