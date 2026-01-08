const WHITESPACE_SPLIT_PATTERN = /\s+/;

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationSummary {
  content: string;
  generatedAt: number;
  coversMessagesUpTo: number;
  tokenCount: number;
}

export interface Conversation {
  id: string;
  teamId: string;
  userId: string;
  messages: ConversationMessage[];
  summary: ConversationSummary | null;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationManagerOptions {
  maxMessages?: number;
  maxTokens?: number;
  summaryThreshold?: number;
  estimateTokens?: (text: string) => number;
  summarize?: (messages: ConversationMessage[]) => Promise<string>;
}

export interface ConversationStore {
  get(id: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
  delete(id: string): Promise<void>;
  search(
    teamId: string,
    query: string,
    limit?: number
  ): Promise<ConversationSearchResult[]>;
}

export interface ConversationSearchResult {
  conversationId: string;
  messageId: string;
  content: string;
  relevanceScore: number;
  timestamp: number;
}

export interface CompactionResult {
  originalMessageCount: number;
  compactedMessageCount: number;
  originalTokenCount: number;
  compactedTokenCount: number;
  summaryGenerated: boolean;
}

const DEFAULT_OPTIONS: Required<
  Omit<ConversationManagerOptions, "summarize">
> & { summarize?: ConversationManagerOptions["summarize"] } = {
  maxMessages: 100,
  maxTokens: 16_000,
  summaryThreshold: 8000,
  estimateTokens: (text: string) => Math.ceil(text.length / 4),
  summarize: undefined,
};

export class ConversationManager {
  private readonly options: typeof DEFAULT_OPTIONS;
  private readonly store: ConversationStore;

  constructor(store: ConversationStore, options?: ConversationManagerOptions) {
    this.store = store;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return await this.store.get(id);
  }

  async createConversation(
    teamId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<Conversation> {
    const now = Date.now();
    const conversation: Conversation = {
      id: `conv_${now}_${Math.random().toString(36).slice(2, 11)}`,
      teamId,
      userId,
      messages: [],
      summary: null,
      createdAt: now,
      updatedAt: now,
      metadata,
    };

    await this.store.save(conversation);
    return conversation;
  }

  async addMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ConversationMessage> {
    const conversation = await this.store.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      role,
      content,
      timestamp: Date.now(),
      tokenCount: this.options.estimateTokens(content),
      metadata,
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    await this.store.save(conversation);
    return message;
  }

  async getMessages(
    conversationId: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    const conversation = await this.store.get(conversationId);
    if (!conversation) {
      return [];
    }

    const messages = conversation.messages;
    if (limit && messages.length > limit) {
      return messages.slice(-limit);
    }
    return messages;
  }

  calculateTokenCount(messages: ConversationMessage[]): number {
    return messages.reduce(
      (sum, msg) =>
        sum + (msg.tokenCount ?? this.options.estimateTokens(msg.content)),
      0
    );
  }

  shouldCompact(conversation: Conversation): boolean {
    const tokenCount = this.calculateTokenCount(conversation.messages);
    return (
      tokenCount > this.options.summaryThreshold ||
      conversation.messages.length > this.options.maxMessages
    );
  }

  async maybeCompactHistory(
    conversationId: string
  ): Promise<CompactionResult | null> {
    const conversation = await this.store.get(conversationId);
    if (!conversation) {
      return null;
    }

    if (!this.shouldCompact(conversation)) {
      return null;
    }

    return this.compactHistory(conversationId);
  }

  async compactHistory(conversationId: string): Promise<CompactionResult> {
    const conversation = await this.store.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const originalMessageCount = conversation.messages.length;
    const originalTokenCount = this.calculateTokenCount(conversation.messages);

    const keepCount = Math.floor(conversation.messages.length / 2);
    const messagesToSummarize =
      keepCount > 0
        ? conversation.messages.slice(0, -keepCount)
        : conversation.messages;
    const messagesToKeep =
      keepCount > 0 ? conversation.messages.slice(-keepCount) : [];

    let summary: ConversationSummary | null = null;
    if (this.options.summarize && messagesToSummarize.length > 0) {
      const summaryText = await this.options.summarize(messagesToSummarize);
      summary = {
        content: summaryText,
        generatedAt: Date.now(),
        coversMessagesUpTo: messagesToSummarize.at(-1)?.timestamp ?? 0,
        tokenCount: this.options.estimateTokens(summaryText),
      };
    }

    const existingSummaryTokens = conversation.summary?.tokenCount ?? 0;
    const combinedSummary = this.combineSummaries(
      conversation.summary,
      summary
    );

    conversation.messages = messagesToKeep;
    conversation.summary = combinedSummary;
    conversation.updatedAt = Date.now();

    await this.store.save(conversation);

    const compactedTokenCount =
      this.calculateTokenCount(messagesToKeep) +
      (combinedSummary?.tokenCount ?? 0);

    return {
      originalMessageCount,
      compactedMessageCount: messagesToKeep.length,
      originalTokenCount: originalTokenCount + existingSummaryTokens,
      compactedTokenCount,
      summaryGenerated: summary !== null,
    };
  }

  private combineSummaries(
    existing: ConversationSummary | null,
    newSummary: ConversationSummary | null
  ): ConversationSummary | null {
    if (!(existing || newSummary)) {
      return null;
    }
    if (!existing) {
      return newSummary;
    }
    if (!newSummary) {
      return existing;
    }

    return {
      content: `${existing.content}\n\n${newSummary.content}`,
      generatedAt: newSummary.generatedAt,
      coversMessagesUpTo: newSummary.coversMessagesUpTo,
      tokenCount: existing.tokenCount + newSummary.tokenCount,
    };
  }

  async searchConversations(
    teamId: string,
    query: string,
    limit?: number
  ): Promise<ConversationSearchResult[]> {
    return await this.store.search(teamId, query, limit);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.store.delete(conversationId);
  }

  async getSummary(conversationId: string): Promise<string | null> {
    const conversation = await this.store.get(conversationId);
    return conversation?.summary?.content ?? null;
  }

  async getContextForPrompt(
    conversationId: string,
    maxTokens?: number
  ): Promise<{ summary: string | null; messages: ConversationMessage[] }> {
    const conversation = await this.store.get(conversationId);
    if (!conversation) {
      return { summary: null, messages: [] };
    }

    const targetTokens = maxTokens ?? this.options.maxTokens;
    const summaryTokens = conversation.summary?.tokenCount ?? 0;
    let availableTokens = targetTokens - summaryTokens;

    const includedMessages: ConversationMessage[] = [];
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const msg = conversation.messages[i];
      if (!msg) {
        continue;
      }
      const msgTokens =
        msg.tokenCount ?? this.options.estimateTokens(msg.content);
      if (msgTokens > availableTokens) {
        break;
      }
      availableTokens -= msgTokens;
      includedMessages.unshift(msg);
    }

    return {
      summary: conversation.summary?.content ?? null,
      messages: includedMessages,
    };
  }
}

export class InMemoryConversationStore implements ConversationStore {
  private readonly conversations: Map<string, Conversation> = new Map();

  get(id: string): Promise<Conversation | null> {
    return Promise.resolve(this.conversations.get(id) ?? null);
  }

  save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, { ...conversation });
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.conversations.delete(id);
    return Promise.resolve();
  }

  search(
    teamId: string,
    query: string,
    limit = 10
  ): Promise<ConversationSearchResult[]> {
    const results: ConversationSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const conv of this.conversations.values()) {
      if (conv.teamId !== teamId) {
        continue;
      }

      for (const msg of conv.messages) {
        if (msg.content.toLowerCase().includes(queryLower)) {
          results.push({
            conversationId: conv.id,
            messageId: msg.id,
            content: msg.content.slice(0, 200),
            relevanceScore: this.calculateSimpleRelevance(msg.content, query),
            timestamp: msg.timestamp,
          });
        }
      }
    }

    return Promise.resolve(
      results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
    );
  }

  private calculateSimpleRelevance(content: string, query: string): number {
    const queryTerms = query.toLowerCase().split(WHITESPACE_SPLIT_PATTERN);
    const contentLower = content.toLowerCase();
    let matches = 0;

    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        matches += 1;
      }
    }

    return queryTerms.length > 0 ? matches / queryTerms.length : 0;
  }

  clear(): void {
    this.conversations.clear();
  }
}

export function createConversationManager(
  store?: ConversationStore,
  options?: ConversationManagerOptions
): ConversationManager {
  return new ConversationManager(
    store ?? new InMemoryConversationStore(),
    options
  );
}
