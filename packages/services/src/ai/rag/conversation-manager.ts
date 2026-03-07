import { estimateTokens, streamCompletion } from "@openbeam/ai";
import type { Database } from "@openbeam/db";
import {
  addConversationMessage,
  createConversation,
  findConversationWithMessages,
  getRecentMessages,
  updateConversationSummary,
  updateConversationTitle,
} from "@openbeam/db";
import type {
  ConversationContext,
  ConversationMessage,
  ExtractedEntity,
} from "./types";

const MAX_CONTEXT_MESSAGES = 20;
const SUMMARIZE_THRESHOLD_TOKENS = 4000;
const TITLE_GENERATION_MESSAGE_COUNT = 2;

const SUMMARIZE_SYSTEM_PROMPT =
  "Summarize this conversation concisely, preserving key facts, decisions, and topics discussed. Keep under 300 words.";

const TITLE_SYSTEM_PROMPT =
  "Generate a short (3-6 words) title for this conversation. Respond with only the title, no quotes or punctuation.";

const MENTION_PATTERN = /@(\w+)/g;

export class ConversationManager {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async createNewConversation(
    userId: string,
    teamId: string,
    title?: string
  ): Promise<string> {
    const conversation = await createConversation(this.db, {
      userId,
      teamId,
      title,
    });
    return conversation.id;
  }

  async getConversationContext(
    conversationId: string,
    userId: string,
    teamId: string
  ): Promise<ConversationContext | null> {
    const conversation = await findConversationWithMessages(
      this.db,
      conversationId,
      userId,
      teamId
    );

    if (!conversation) {
      return null;
    }

    const recentMessages = conversation.messages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: m.createdAt.getTime(),
      }));

    const entities = extractEntitiesFromMessages(recentMessages);

    return {
      conversationId: conversation.id,
      previousMessages: recentMessages,
      summary: conversation.summary,
      entities,
    };
  }

  async addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    metadata?: {
      citations?: unknown[];
      contextDocIds?: string[];
      groundingScore?: number;
      confidence?: string;
      promptTokens?: number;
      completionTokens?: number;
      latencyMs?: number;
      firstTokenMs?: number;
    }
  ): Promise<void> {
    await addConversationMessage(this.db, conversationId, {
      role,
      content,
      ...metadata,
    });

    const messages = await getRecentMessages(this.db, conversationId, 30);

    const totalTokens = messages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0
    );

    if (totalTokens > SUMMARIZE_THRESHOLD_TOKENS) {
      await this.summarizeConversation(conversationId, messages);
    }

    if (messages.length === TITLE_GENERATION_MESSAGE_COUNT) {
      await this.generateTitle(conversationId, messages);
    }
  }

  private async summarizeConversation(
    conversationId: string,
    messages: Array<{ id: string; content: string; role: string }>
  ): Promise<void> {
    const messagesToSummarize = messages.slice(0, -5);
    if (messagesToSummarize.length < 4) {
      return;
    }

    const conversationText = messagesToSummarize
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const chunks: string[] = [];
    const stream = streamCompletion(
      [{ role: "user", content: `Conversation:\n${conversationText}` }],
      { systemPrompt: SUMMARIZE_SYSTEM_PROMPT, temperature: 0.3 }
    );

    for await (const chunk of stream) {
      if (chunk.type === "text") {
        chunks.push(chunk.content);
      }
    }

    const summary = chunks.join("");
    const lastSummarizedMessage = messagesToSummarize.at(-1);

    await updateConversationSummary(
      this.db,
      conversationId,
      summary,
      lastSummarizedMessage?.id
    );
  }

  private async generateTitle(
    conversationId: string,
    messages: Array<{ content: string; role: string }>
  ): Promise<void> {
    const conversationText = messages
      .slice(0, 3)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const chunks: string[] = [];
    const stream = streamCompletion(
      [{ role: "user", content: conversationText }],
      { systemPrompt: TITLE_SYSTEM_PROMPT, temperature: 0.5 }
    );

    for await (const chunk of stream) {
      if (chunk.type === "text") {
        chunks.push(chunk.content);
      }
    }

    const title = chunks.join("").trim().slice(0, 100);
    if (title) {
      await updateConversationTitle(this.db, conversationId, title);
    }
  }

  buildContextWindow(
    context: ConversationContext,
    maxTokens: number
  ): ConversationMessage[] {
    const messages = [...context.previousMessages];
    let totalTokens = context.summary ? estimateTokens(context.summary) : 0;

    const result: ConversationMessage[] = [];

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (!msg) {
        continue;
      }

      const msgTokens = estimateTokens(msg.content);

      if (totalTokens + msgTokens > maxTokens) {
        break;
      }

      result.unshift(msg);
      totalTokens += msgTokens;
    }

    return result;
  }
}

function extractEntitiesFromMessages(
  messages: ConversationMessage[]
): Map<string, ExtractedEntity> {
  const entities = new Map<string, ExtractedEntity>();

  for (const message of messages) {
    const matches = message.content.matchAll(MENTION_PATTERN);
    for (const match of matches) {
      const name = match[1];
      if (name && !entities.has(name.toLowerCase())) {
        entities.set(name.toLowerCase(), {
          text: name,
          type: "person",
          confidence: 0.8,
        });
      }
    }
  }

  return entities;
}

let instance: ConversationManager | null = null;

export function getConversationManager(db: Database): ConversationManager {
  if (!instance) {
    instance = new ConversationManager(db);
  }
  return instance;
}
