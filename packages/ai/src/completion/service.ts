/**
 * Completion Service
 *
 * Provides chat completion with support for:
 * - Multiple providers (OpenAI, Anthropic, Google, Azure, Ollama)
 * - Streaming responses with AI SDK patterns
 * - Tool/function calling with automatic execution
 * - Context injection for RAG
 * - Multi-turn conversations with DB persistence
 * - Redis caching for repeated queries
 *
 * Architecture:
 * - Uses AI SDK generateText/streamText for completions
 * - Database persistence via @openplane/db
 * - Redis caching via @openplane/redis
 */

import { type CoreMessage, type CoreTool, generateText, streamText } from "ai";
import { getConfig } from "../config";
import { registry } from "../providers";
import type { ProviderId } from "../providers/types";
import { createSSEStream } from "./streaming";
import type {
  ChatMessage,
  Citation,
  CompletionContext,
  CompletionOptions,
  CompletionResult,
  ContextDocument,
  Conversation,
  RAGCompletionResult,
  StreamChunk,
  ToolCall,
} from "./types";

/**
 * Default system prompt for RAG
 */
const DEFAULT_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context.

Instructions:
- Answer the user's question based primarily on the provided context documents
- If the context doesn't contain enough information, say so clearly
- Cite your sources by referencing document titles when making claims
- Be concise but comprehensive
- If you're unsure about something, acknowledge the uncertainty
- Format your response using markdown for better readability`;

/**
 * Completion Service class
 */
export class CompletionService {
  private readonly provider: ProviderId;
  private readonly modelId: string;
  private readonly defaultSystemPrompt: string;

  constructor(
    options: {
      provider?: ProviderId;
      model?: string;
      systemPrompt?: string;
    } = {}
  ) {
    const config = getConfig();

    this.provider = options.provider || config.defaultProvider;
    this.modelId = options.model || config.defaultChatModel;
    this.defaultSystemPrompt = options.systemPrompt || "";
  }

  /**
   * Get the language model instance
   */
  private getModel(provider?: ProviderId, modelId?: string) {
    return registry.getChatModel(
      provider || this.provider,
      modelId || this.modelId
    );
  }

  /**
   * Convert our message format to AI SDK format
   */
  private toSDKMessages(messages: ChatMessage[]): CoreMessage[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool" as const,
          content: [
            {
              type: "tool-result" as const,
              toolCallId: msg.toolCallId || "",
              toolName: msg.name || "",
              result: msg.content,
            },
          ],
        };
      }

      return {
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      };
    });
  }

  /**
   * Try to get cached completion
   */
  private async getCachedCompletion(
    messages: ChatMessage[],
    options: CompletionOptions
  ): Promise<CompletionResult | null> {
    const config = getConfig();
    if (!config.cache.enableCompletionCache) {
      return null;
    }

    try {
      const { contextCache } = await import("@openplane/redis");
      const cacheKey = JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model: options.model || this.modelId,
        temperature: options.temperature,
      });

      const cached = await contextCache.getContext("completion", cacheKey, {});
      if (cached && cached.results[0]) {
        return cached.results[0].metadata as unknown as CompletionResult;
      }
    } catch {
      // Cache miss or error, continue without cache
    }

    return null;
  }

  /**
   * Cache a completion result
   */
  private async cacheCompletion(
    messages: ChatMessage[],
    options: CompletionOptions,
    result: CompletionResult
  ): Promise<void> {
    const config = getConfig();
    if (!config.cache.enableCompletionCache) {
      return;
    }

    try {
      const { contextCache } = await import("@openplane/redis");
      const cacheKey = JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model: options.model || this.modelId,
        temperature: options.temperature,
      });

      await contextCache.setContext(
        "completion",
        cacheKey,
        {},
        [
          {
            documentId: "completion",
            title: "Cached Completion",
            content: result.content,
            score: 1.0,
            metadata: result as unknown as Record<string, unknown>,
          },
        ],
        undefined,
        config.cache.completionCacheTTL
      );
    } catch {
      // Cache error, continue without caching
    }
  }

  /**
   * Generate a completion (non-streaming)
   */
  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const startTime = Date.now();

    // Check cache for deterministic queries (temperature 0)
    if (options.temperature === 0) {
      const cached = await this.getCachedCompletion(messages, options);
      if (cached) {
        return { ...cached, latencyMs: Date.now() - startTime };
      }
    }

    // Build system message
    const systemPrompt = options.systemPrompt || this.defaultSystemPrompt;
    const allMessages: ChatMessage[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const result = await generateText({
      model: this.getModel(options.provider, options.model),
      messages: this.toSDKMessages(allMessages),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      tools: options.tools as Record<string, CoreTool> | undefined,
      abortSignal: options.abortSignal,
    });

    // Extract tool calls if any
    const toolCalls: ToolCall[] = [];
    if (result.toolCalls?.length && result.toolCalls.length > 0) {
      for (const tc of result.toolCalls) {
        toolCalls.push({
          id: tc.toolCallId,
          name: tc.toolName,
          arguments: tc.args as Record<string, unknown>,
        });
      }
    }

    const completionResult: CompletionResult = {
      content: result.text,
      role: "assistant",
      finishReason: result.finishReason as CompletionResult["finishReason"],
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      },
      latencyMs: Date.now() - startTime,
    };

    // Cache deterministic completions
    if (options.temperature === 0) {
      await this.cacheCompletion(messages, options, completionResult);
    }

    return completionResult;
  }

  /**
   * Generate a streaming completion
   */
  async *stream(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncIterable<StreamChunk> {
    const startTime = Date.now();

    // Build system message
    const systemPrompt = options.systemPrompt || this.defaultSystemPrompt;
    const allMessages: ChatMessage[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const result = streamText({
      model: this.getModel(options.provider, options.model),
      messages: this.toSDKMessages(allMessages),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      tools: options.tools as Record<string, CoreTool> | undefined,
      abortSignal: options.abortSignal,
    });

    let totalText = "";

    for await (const chunk of result.textStream) {
      totalText += chunk;

      if (options.onToken) {
        options.onToken(chunk);
      }

      yield {
        type: "text",
        content: chunk,
      };
    }

    // Get final result for usage
    const finalResult = await result;

    yield {
      type: "done",
      content: totalText,
      usage: {
        promptTokens: finalResult.usage?.promptTokens || 0,
        completionTokens: finalResult.usage?.completionTokens || 0,
      },
    };

    if (options.onComplete) {
      options.onComplete({
        content: totalText,
        role: "assistant",
        finishReason:
          finalResult.finishReason as CompletionResult["finishReason"],
        usage: {
          promptTokens: finalResult.usage?.promptTokens || 0,
          completionTokens: finalResult.usage?.completionTokens || 0,
          totalTokens: finalResult.usage?.totalTokens || 0,
        },
        latencyMs: Date.now() - startTime,
      });
    }
  }

  /**
   * Stream text only (simpler interface)
   */
  async *streamText(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncIterable<string> {
    for await (const chunk of this.stream(messages, options)) {
      if (chunk.type === "text" && chunk.content) {
        yield chunk.content;
      }
    }
  }

  /**
   * Complete with context (RAG)
   */
  async completeWithContext(
    query: string,
    context: CompletionContext,
    options: CompletionOptions = {}
  ): Promise<RAGCompletionResult> {
    // Build context prompt
    const contextPrompt = this.buildContextPrompt(context.documents);

    // Build messages
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Context Documents:\n${contextPrompt}\n\nQuestion: ${query}`,
      },
    ];

    // Use RAG system prompt
    const ragOptions: CompletionOptions = {
      ...options,
      systemPrompt: options.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT,
    };

    const result = await this.complete(messages, ragOptions);

    // Extract citations from context
    const citations = this.extractCitations(result.content, context.documents);

    return {
      ...result,
      citations,
      contextUsed: context.documents.length,
    };
  }

  /**
   * Stream with context (RAG)
   */
  async *streamWithContext(
    query: string,
    context: CompletionContext,
    options: CompletionOptions = {}
  ): AsyncIterable<StreamChunk> {
    // Build context prompt
    const contextPrompt = this.buildContextPrompt(context.documents);

    // Build messages
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Context Documents:\n${contextPrompt}\n\nQuestion: ${query}`,
      },
    ];

    // Use RAG system prompt
    const ragOptions: CompletionOptions = {
      ...options,
      systemPrompt: options.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT,
    };

    yield* this.stream(messages, ragOptions);
  }

  /**
   * Build context prompt from documents
   */
  private buildContextPrompt(documents: ContextDocument[]): string {
    if (documents.length === 0) {
      return "No relevant documents found.";
    }

    return documents
      .map((doc, index) => {
        const header = `[Document ${index + 1}: ${doc.title}]`;
        const source = doc.source ? `Source: ${doc.source}` : "";
        const url = doc.url ? `URL: ${doc.url}` : "";
        const meta = [source, url].filter(Boolean).join(" | ");

        return `${header}\n${meta ? `${meta}\n` : ""}${doc.content}`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Extract citations from response
   */
  private extractCitations(
    response: string,
    documents: ContextDocument[]
  ): Citation[] {
    const citations: Citation[] = [];
    const citedDocs = new Set<string>();

    // Look for document title mentions in the response
    for (const doc of documents) {
      if (
        (response.toLowerCase().includes(doc.title.toLowerCase()) ||
          (doc.source &&
            response.toLowerCase().includes(doc.source.toLowerCase()))) &&
        !citedDocs.has(doc.id)
      ) {
        citedDocs.add(doc.id);
        citations.push({
          documentId: doc.id,
          title: doc.title,
          url: doc.url,
          snippet: doc.content.slice(0, 200),
          relevanceScore: doc.relevanceScore,
        });
      }
    }

    // If no explicit citations found, include top documents as potential sources
    if (citations.length === 0) {
      for (const doc of documents.slice(0, 3)) {
        citations.push({
          documentId: doc.id,
          title: doc.title,
          url: doc.url,
          snippet: doc.content.slice(0, 200),
          relevanceScore: doc.relevanceScore,
        });
      }
    }

    return citations;
  }

  /**
   * Chat with conversation history and DB persistence
   */
  async chat(
    userMessage: string,
    conversation: Conversation,
    options: CompletionOptions = {}
  ): Promise<{ response: CompletionResult; conversation: Conversation }> {
    // Add user message
    const messages: ChatMessage[] = [
      ...conversation.messages,
      { role: "user", content: userMessage },
    ];

    // Generate response
    const response = await this.complete(messages, {
      ...options,
      systemPrompt: options.systemPrompt || conversation.systemPrompt,
    });

    // Update conversation
    const updatedConversation: Conversation = {
      ...conversation,
      messages: [...messages, { role: "assistant", content: response.content }],
    };

    // Persist to database if conversationId exists
    if (conversation.id) {
      try {
        const { addMessage } = await import("@openplane/db");
        const prisma = (await import("@openplane/db")).default;

        // Add user message
        await addMessage(prisma, {
          conversationId: conversation.id,
          role: "USER",
          content: userMessage,
        });

        // Add assistant response
        await addMessage(prisma, {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: response.content,
          tokensUsed: response.usage.totalTokens,
        });
      } catch (error) {
        console.warn("Failed to persist conversation:", error);
      }
    }

    return { response, conversation: updatedConversation };
  }

  /**
   * Create SSE response for HTTP streaming
   */
  createSSEResponse(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): ReadableStream<Uint8Array> {
    const stream = this.stream(messages, options);
    return createSSEStream(stream);
  }

  /**
   * Create a new service instance with different config
   */
  withConfig(options: {
    provider?: ProviderId;
    model?: string;
    systemPrompt?: string;
  }): CompletionService {
    return new CompletionService({
      provider: options.provider || this.provider,
      model: options.model || this.modelId,
      systemPrompt: options.systemPrompt || this.defaultSystemPrompt,
    });
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      provider: this.provider,
      model: this.modelId,
    };
  }
}

/**
 * Default completion service instance
 */
export const completionService = new CompletionService();

/**
 * Convenience functions
 */
export async function complete(
  messages: ChatMessage[],
  options?: CompletionOptions
): Promise<CompletionResult> {
  return completionService.complete(messages, options);
}

export async function* streamCompletion(
  messages: ChatMessage[],
  options?: CompletionOptions
): AsyncIterable<StreamChunk> {
  yield* completionService.stream(messages, options);
}

export async function completeWithContext(
  query: string,
  context: CompletionContext,
  options?: CompletionOptions
): Promise<RAGCompletionResult> {
  return completionService.completeWithContext(query, context, options);
}

export default completionService;
