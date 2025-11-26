/**
 * Completion Exports
 */

// Service
export {
  CompletionService,
  complete,
  completeWithContext,
  completionService,
  streamCompletion,
} from "./service";

// Streaming utilities
export {
  chunkByTokens,
  collectStreamText,
  createSSEStream,
  createTextStream,
  parseSSEStream,
  rateLimit,
  teeStream,
} from "./streaming";
// Types
export type {
  ChatMessage,
  Citation,
  CompletionConfig,
  CompletionContext,
  CompletionOptions,
  CompletionResult,
  ContextDocument,
  Conversation,
  MessageRole,
  RAGCompletionResult,
  StreamChunk,
  StreamingCompletionResult,
  ToolCall,
  ToolCallResult,
} from "./types";
// UI Message utilities (compatible with AI SDK useChat)
export type {
  DataStreamPart,
  PersistedUIMessage,
  UIAnnotation,
  UIAttachment,
  UIMessage,
  UIToolInvocation,
} from "./ui-messages";
export {
  createAssistantMessage,
  createDataPart,
  createDataStream,
  createFinishPart,
  createSystemMessage,
  createTextPart,
  createToolCallPart,
  createToolResultPart,
  createUserMessage,
  encodeDataStreamPart,
  fromUIMessage,
  fromUIMessages,
  generateMessageId,
  parseDataStreamLine,
  toUIMessage,
  toUIMessages,
} from "./ui-messages";
