/**
 * Completion Types
 *
 * Type definitions for the chat completion service.
 */

import type { CoreTool } from "ai";
import type { ProviderId } from "../providers/types";

/**
 * Role for chat messages
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/**
 * Tool call in a message
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool result
 */
export interface ToolCallResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

/**
 * Completion model configuration
 */
export interface CompletionConfig {
  provider: ProviderId;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

/**
 * Completion options
 */
export interface CompletionOptions {
  // Model config
  provider?: ProviderId;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;

  // System prompt
  systemPrompt?: string;

  // Tools
  tools?: Record<string, CoreTool>;

  // Streaming callbacks
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onComplete?: (result: CompletionResult) => void;

  // Abort signal
  abortSignal?: AbortSignal;
}

/**
 * Completion result
 */
export interface CompletionResult {
  content: string;
  role: MessageRole;
  finishReason: "stop" | "length" | "tool-calls" | "content-filter" | "error";
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

/**
 * Streaming completion result
 */
export interface StreamingCompletionResult {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

/**
 * Context for completion (documents for RAG)
 */
export interface CompletionContext {
  documents: ContextDocument[];
  maxTokens?: number;
}

/**
 * Document in context
 */
export interface ContextDocument {
  id: string;
  title: string;
  content: string;
  url?: string;
  source?: string;
  relevanceScore?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Citation in response
 */
export interface Citation {
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  relevanceScore?: number;
}

/**
 * RAG completion result
 */
export interface RAGCompletionResult extends CompletionResult {
  citations: Citation[];
  contextUsed: number;
}

/**
 * Conversation for multi-turn chat
 */
export interface Conversation {
  id: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Stream chunk for SSE
 */
export interface StreamChunk {
  type: "text" | "tool_call" | "error" | "done";
  content?: string;
  toolCall?: ToolCall;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}
