import { generateText, type ModelMessage, streamText } from "ai";
import { getConfig, type ProviderId } from "../config";
import { registry } from "../providers/registry";
import {
  buildThinkingProviderOptions,
  extractReasoningContent,
} from "../providers/thinking";
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
  TokenUsage,
  ToolCall,
} from "./types";

const DEFAULT_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context.

Instructions:
- Answer the user's question based primarily on the provided context documents
- If the context doesn't contain enough information, say so clearly
- Cite your sources by referencing document titles when making claims
- Be concise but comprehensive
- If you're unsure about something, acknowledge the uncertainty
- Format your response using markdown for better readability`;

function normalizeUsage(usage: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): TokenUsage {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.totalTokens ?? inputTokens + outputTokens,
  };
}

export class CompletionService {
  private readonly providerId: ProviderId;
  private readonly modelId: string;
  private readonly defaultSystemPrompt: string;

  constructor(
    options: {
      providerId?: ProviderId;
      modelId?: string;
      systemPrompt?: string;
    } = {}
  ) {
    const config = getConfig();
    this.providerId = options.providerId || config.defaultProvider;
    this.modelId = options.modelId || config.defaultChatModel;
    this.defaultSystemPrompt = options.systemPrompt || "";
  }

  private getModel(providerId?: ProviderId, modelId?: string) {
    return registry.chatModel(
      providerId || this.providerId,
      modelId || this.modelId
    );
  }

  private toSDKMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map((msg): ModelMessage => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: msg.toolCallId || "",
              toolName: msg.name || "",
              output: { type: "text", value: msg.content },
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

  async complete(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const startTime = Date.now();

    const systemPrompt = options.systemPrompt || this.defaultSystemPrompt;
    const allMessages: ChatMessage[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const config = getConfig();

    const result = await generateText({
      model: this.getModel(options.providerId, options.modelId),
      messages: this.toSDKMessages(allMessages),
      temperature: options.temperature ?? config.completion.temperature,
      maxOutputTokens: options.maxTokens ?? config.completion.maxTokens,
      topP: options.topP ?? config.completion.topP,
      tools: options.tools,
      abortSignal: options.abortSignal,
    });

    const toolCalls: ToolCall[] = [];
    if (result.toolCalls?.length) {
      for (const tc of result.toolCalls) {
        toolCalls.push({
          id: tc.toolCallId,
          name: tc.toolName,
          arguments: tc.input as Record<string, unknown>,
        });
      }
    }

    const completionResult: CompletionResult = {
      content: result.text,
      role: "assistant",
      finishReason: result.finishReason,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: normalizeUsage(result.usage),
      latencyMs: Date.now() - startTime,
    };

    if (options.onComplete) {
      options.onComplete(completionResult);
    }

    return completionResult;
  }

  private async *streamWithThinking(
    fullStream: AsyncIterable<unknown>,
    options: CompletionOptions
  ): AsyncGenerator<{ chunk: StreamChunk; text: string }> {
    for await (const chunk of fullStream) {
      const chunkObj = chunk as Record<string, unknown>;
      if (
        chunkObj.type === "reasoning" ||
        chunkObj.type === "reasoning-delta"
      ) {
        const reasoningContent = extractReasoningContent(chunk);
        if (reasoningContent) {
          options.onThinking?.(reasoningContent);
          yield {
            chunk: { type: "thinking", content: reasoningContent },
            text: "",
          };
        }
      } else if (chunkObj.type === "text-delta") {
        const text = (chunkObj.textDelta as string) || "";
        if (text) {
          options.onToken?.(text);
          yield { chunk: { type: "text", content: text }, text };
        }
      }
    }
  }

  private async *streamStandard(
    textStream: AsyncIterable<string>,
    options: CompletionOptions
  ): AsyncGenerator<{ chunk: StreamChunk; text: string }> {
    for await (const text of textStream) {
      options.onToken?.(text);
      yield { chunk: { type: "text", content: text }, text };
    }
  }

  async *stream(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();

    const systemPrompt = options.systemPrompt || this.defaultSystemPrompt;
    const allMessages: ChatMessage[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const config = getConfig();

    const streamTextParams = {
      model: this.getModel(options.providerId, options.modelId),
      messages: this.toSDKMessages(allMessages),
      temperature: options.temperature ?? config.completion.temperature,
      maxOutputTokens: options.maxTokens ?? config.completion.maxTokens,
      topP: options.topP ?? config.completion.topP,
      tools: options.tools,
      abortSignal: options.abortSignal,
    } as Parameters<typeof streamText>[0];

    if (options.enableThinking) {
      streamTextParams.providerOptions = buildThinkingProviderOptions({
        enabled: true,
      }) as typeof streamTextParams.providerOptions;
    }

    const result = streamText(streamTextParams);
    let totalText = "";

    const innerStream = options.enableThinking
      ? this.streamWithThinking(result.fullStream, options)
      : this.streamStandard(result.textStream, options);

    for await (const { chunk, text } of innerStream) {
      totalText += text;
      yield chunk;
    }

    const [finalUsage, finalFinishReason] = await Promise.all([
      result.usage,
      result.finishReason,
    ]);

    const usage = normalizeUsage(finalUsage);

    yield {
      type: "done",
      content: totalText,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    };

    if (options.onComplete) {
      options.onComplete({
        content: totalText,
        role: "assistant",
        finishReason: finalFinishReason,
        usage,
        latencyMs: Date.now() - startTime,
      });
    }
  }

  async *streamText(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<string> {
    const stream = this.stream(messages, options);
    for await (const chunk of stream) {
      if (chunk.type === "text" && chunk.content) {
        yield chunk.content;
      }
    }
  }

  async completeWithContext(
    query: string,
    context: CompletionContext,
    options: CompletionOptions = {}
  ): Promise<RAGCompletionResult> {
    const contextPrompt = this.buildContextPrompt(context.documents);

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Context Documents:\n${contextPrompt}\n\nQuestion: ${query}`,
      },
    ];

    const ragOptions: CompletionOptions = {
      ...options,
      systemPrompt: options.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT,
    };

    const result = await this.complete(messages, ragOptions);
    const citations = this.extractCitations(result.content, context.documents);

    return {
      ...result,
      citations,
      contextUsed: context.documents.length,
    };
  }

  async *streamWithContext(
    query: string,
    context: CompletionContext,
    options: CompletionOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const contextPrompt = this.buildContextPrompt(context.documents);

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Context Documents:\n${contextPrompt}\n\nQuestion: ${query}`,
      },
    ];

    const ragOptions: CompletionOptions = {
      ...options,
      systemPrompt: options.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT,
    };

    for await (const chunk of this.stream(messages, ragOptions)) {
      yield chunk;
    }
  }

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

  private extractCitations(
    response: string,
    documents: ContextDocument[]
  ): Citation[] {
    const citations: Citation[] = [];
    const citedDocs = new Set<string>();

    for (const doc of documents) {
      const titleLower = doc.title.toLowerCase();
      const sourceLower = doc.source?.toLowerCase();
      const responseLower = response.toLowerCase();

      if (
        (responseLower.includes(titleLower) ||
          (sourceLower && responseLower.includes(sourceLower))) &&
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

  async chat(
    userMessage: string,
    conversation: Conversation,
    options: CompletionOptions = {}
  ): Promise<{ response: CompletionResult; conversation: Conversation }> {
    const messages: ChatMessage[] = [
      ...conversation.messages,
      { role: "user", content: userMessage },
    ];

    const response = await this.complete(messages, {
      ...options,
      systemPrompt: options.systemPrompt || conversation.systemPrompt,
    });

    const updatedConversation: Conversation = {
      ...conversation,
      messages: [...messages, { role: "assistant", content: response.content }],
    };

    return { response, conversation: updatedConversation };
  }

  createSSEResponse(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): ReadableStream<Uint8Array> {
    const stream = this.stream(messages, options);
    return createSSEStream(stream);
  }

  withConfig(options: {
    providerId?: ProviderId;
    modelId?: string;
    systemPrompt?: string;
  }): CompletionService {
    return new CompletionService({
      providerId: options.providerId || this.providerId,
      modelId: options.modelId || this.modelId,
      systemPrompt: options.systemPrompt || this.defaultSystemPrompt,
    });
  }

  getConfig() {
    return {
      providerId: this.providerId,
      modelId: this.modelId,
    };
  }
}

export const completionService = new CompletionService();

export function complete(
  messages: ChatMessage[],
  options?: CompletionOptions
): Promise<CompletionResult> {
  return completionService.complete(messages, options);
}

export function streamCompletion(
  messages: ChatMessage[],
  options?: CompletionOptions
): AsyncGenerator<StreamChunk> {
  return completionService.stream(messages, options);
}

export function completeWithContext(
  query: string,
  context: CompletionContext,
  options?: CompletionOptions
): Promise<RAGCompletionResult> {
  return completionService.completeWithContext(query, context, options);
}
