import { z } from "zod";
import { ProviderIdSchema } from "./providers";

export const MessageRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
  "tool",
]);

export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  result: z.unknown().optional(),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const FinishReasonSchema = z.enum([
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
  "unknown",
]);

export type FinishReason = z.infer<typeof FinishReasonSchema>;

export const CompletionResultSchema = z.object({
  content: z.string(),
  role: z.literal("assistant"),
  finishReason: FinishReasonSchema,
  toolCalls: z.array(ToolCallSchema).optional(),
  usage: TokenUsageSchema,
  latencyMs: z.number().nonnegative(),
});

export type CompletionResult = z.infer<typeof CompletionResultSchema>;

export const StreamChunkTextSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
});

export const StreamChunkThinkingSchema = z.object({
  type: z.literal("thinking"),
  content: z.string(),
});

export const StreamChunkToolCallSchema = z.object({
  type: z.literal("tool-call"),
  toolCall: ToolCallSchema,
});

export const StreamChunkErrorSchema = z.object({
  type: z.literal("error"),
  error: z.string(),
});

export const StreamChunkDoneSchema = z.object({
  type: z.literal("done"),
  content: z.string(),
  usage: TokenUsageSchema.partial().optional(),
});

export const StreamChunkSchema = z.discriminatedUnion("type", [
  StreamChunkTextSchema,
  StreamChunkThinkingSchema,
  StreamChunkToolCallSchema,
  StreamChunkErrorSchema,
  StreamChunkDoneSchema,
]);

export type StreamChunk = z.infer<typeof StreamChunkSchema>;

export const CompletionOptionsSchema = z.object({
  providerId: ProviderIdSchema.optional(),
  modelId: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  enableThinking: z.boolean().optional(),
});

export type CompletionOptions = z.infer<typeof CompletionOptionsSchema>;

export const ContextDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().optional(),
  source: z.string().optional(),
  relevanceScore: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ContextDocument = z.infer<typeof ContextDocumentSchema>;

export const CitationSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  relevanceScore: z.number().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const CompletionContextSchema = z.object({
  documents: z.array(ContextDocumentSchema),
  query: z.string().optional(),
});

export type CompletionContext = z.infer<typeof CompletionContextSchema>;

export const RAGCompletionResultSchema = CompletionResultSchema.extend({
  citations: z.array(CitationSchema),
  contextUsed: z.number().int().nonnegative(),
});

export type RAGCompletionResult = z.infer<typeof RAGCompletionResultSchema>;

export const ConversationSchema = z.object({
  id: z.string().optional(),
  messages: z.array(ChatMessageSchema),
  systemPrompt: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;
