import type { FinishReason, ToolSet } from "ai";
import type { ProviderId } from "../config";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type { FinishReason };

export interface CompletionResult {
  content: string;
  role: "assistant";
  finishReason: FinishReason;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  latencyMs: number;
}

export type StreamChunk =
  | { type: "text"; content: string }
  | { type: "thinking"; content: string }
  | { type: "tool-call"; toolCall: ToolCall }
  | { type: "error"; error: string }
  | { type: "done"; content: string; usage?: Partial<TokenUsage> };

export type AISDKToolSet = ToolSet;

export interface CompletionOptions {
  providerId?: ProviderId;
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: ToolSet;
  abortSignal?: AbortSignal;
  enableThinking?: boolean;
  onToken?: (token: string) => void;
  onThinking?: (content: string) => void;
  onComplete?: (result: CompletionResult) => void;
}

export interface ContextDocument {
  id: string;
  title: string;
  content: string;
  url?: string;
  source?: string;
  relevanceScore?: number;
  metadata?: Record<string, unknown>;
}

export interface Citation {
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  relevanceScore?: number;
}

export interface CompletionContext {
  documents: ContextDocument[];
  query?: string;
}

export interface RAGCompletionResult extends CompletionResult {
  citations: Citation[];
  contextUsed: number;
}

export interface Conversation {
  id?: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}
