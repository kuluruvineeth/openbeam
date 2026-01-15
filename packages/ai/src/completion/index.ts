export type {
  ChatMessage,
  Citation,
  CompletionContext,
  CompletionResult,
  ContextDocument,
  Conversation,
  MessageRole,
  RAGCompletionResult,
  StreamChunk,
  TokenUsage,
  ToolCall,
} from "@openplane/types/ai";
export { FinishReasonSchema } from "@openplane/types/ai";
export {
  CompletionService,
  complete,
  completeWithContext,
  completionService,
  streamCompletion,
} from "./service";
export {
  collectStream,
  createDataStream,
  createFinishPart,
  createSSEStream,
  createTextPart,
  parseSSEStream,
} from "./streaming";
export type FinishReason =
  | "stop"
  | "length"
  | "content_filter"
  | "tool_calls"
  | "error"
  | "unknown";

export type { AISDKToolSet, CompletionOptions } from "./types";
