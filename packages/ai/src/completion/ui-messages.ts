/**
 * UI Message Utilities
 *
 * Provides utilities for working with AI SDK UIMessage format.
 * Compatible with useChat, useAssistant, and other AI SDK UI hooks.
 *
 * Features:
 * - Convert between internal and UI message formats
 * - Support for message metadata and attachments
 * - Tool call result handling
 * - Stream protocol compatibility
 */

import type { ChatMessage, Citation, ToolCall } from "./types";

/**
 * UI Message format (compatible with AI SDK useChat)
 */
export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
  createdAt?: Date;
  /** Tool invocations in this message */
  toolInvocations?: UIToolInvocation[];
  /** Annotations/metadata */
  annotations?: UIAnnotation[];
  /** File attachments */
  attachments?: UIAttachment[];
}

/**
 * Tool invocation in UI format
 */
export interface UIToolInvocation {
  state: "call" | "partial-call" | "result";
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

/**
 * Annotation for UI messages
 */
export interface UIAnnotation {
  type: string;
  data: unknown;
}

/**
 * File attachment for UI messages
 */
export interface UIAttachment {
  name: string;
  contentType: string;
  url: string;
}

/**
 * Data stream part types (for streaming to UI)
 */
export type DataStreamPart =
  | { type: "text"; value: string }
  | { type: "tool_call"; value: UIToolInvocation }
  | { type: "tool_result"; value: UIToolInvocation }
  | { type: "data"; value: UIAnnotation }
  | { type: "error"; value: string }
  | { type: "finish"; value: { finishReason: string; usage?: unknown } };

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Convert internal ChatMessage to UI format
 */
export function toUIMessage(
  message: ChatMessage,
  options: {
    id?: string;
    toolCalls?: ToolCall[];
    citations?: Citation[];
    createdAt?: Date;
  } = {}
): UIMessage {
  const uiMessage: UIMessage = {
    id: options.id || generateMessageId(),
    role: message.role as UIMessage["role"],
    content: message.content,
    createdAt: options.createdAt || new Date(),
  };

  // Add tool invocations if present
  if (options.toolCalls && options.toolCalls.length > 0) {
    uiMessage.toolInvocations = options.toolCalls.map((tc) => ({
      state: "result" as const,
      toolCallId: tc.id,
      toolName: tc.name,
      args: tc.arguments,
    }));
  }

  // Add citations as annotations
  if (options.citations && options.citations.length > 0) {
    uiMessage.annotations = options.citations.map((c) => ({
      type: "citation",
      data: {
        documentId: c.documentId,
        title: c.title,
        url: c.url,
        snippet: c.snippet,
        relevanceScore: c.relevanceScore,
      },
    }));
  }

  return uiMessage;
}

/**
 * Convert UI message to internal ChatMessage format
 */
export function fromUIMessage(uiMessage: UIMessage): ChatMessage {
  const message: ChatMessage = {
    role: uiMessage.role === "data" ? "system" : uiMessage.role,
    content: uiMessage.content,
  };

  return message;
}

/**
 * Convert multiple UI messages to internal format
 */
export function fromUIMessages(uiMessages: UIMessage[]): ChatMessage[] {
  return uiMessages.filter((m) => m.role !== "data").map(fromUIMessage);
}

/**
 * Convert multiple internal messages to UI format
 */
export function toUIMessages(
  messages: ChatMessage[],
  metadata?: {
    messageIds?: Map<number, string>;
    createdAtMap?: Map<number, Date>;
  }
): UIMessage[] {
  return messages.map((m, i) => {
    const id = metadata?.messageIds?.get(i);
    const createdAt = metadata?.createdAtMap?.get(i);
    return toUIMessage(m, { id, createdAt });
  });
}

/**
 * Create a data stream part for text
 */
export function createTextPart(text: string): DataStreamPart {
  return { type: "text", value: text };
}

/**
 * Create a data stream part for tool call
 */
export function createToolCallPart(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>
): DataStreamPart {
  return {
    type: "tool_call",
    value: {
      state: "call",
      toolCallId,
      toolName,
      args,
    },
  };
}

/**
 * Create a data stream part for tool result
 */
export function createToolResultPart(
  toolCallId: string,
  toolName: string,
  result: unknown
): DataStreamPart {
  return {
    type: "tool_result",
    value: {
      state: "result",
      toolCallId,
      toolName,
      result,
    },
  };
}

/**
 * Create a data stream part for custom data
 */
export function createDataPart(type: string, data: unknown): DataStreamPart {
  return {
    type: "data",
    value: { type, data },
  };
}

/**
 * Create a finish part
 */
export function createFinishPart(
  finishReason: string,
  usage?: { promptTokens: number; completionTokens: number }
): DataStreamPart {
  return {
    type: "finish",
    value: { finishReason, usage },
  };
}

/**
 * Encode a data stream part for SSE
 */
export function encodeDataStreamPart(part: DataStreamPart): string {
  // Format: type:JSON
  const typePrefix = `${getStreamTypeCode(part.type)}:`;
  return typePrefix + JSON.stringify(part.value);
}

/**
 * Get single-character type code for stream
 */
function getStreamTypeCode(type: DataStreamPart["type"]): string {
  switch (type) {
    case "text":
      return "0";
    case "tool_call":
      return "9";
    case "tool_result":
      return "a";
    case "data":
      return "2";
    case "error":
      return "3";
    case "finish":
      return "d";
    default:
      return "2"; // Default to data
  }
}

/**
 * Create a ReadableStream that emits data stream parts
 */
export function createDataStream(
  parts: AsyncIterable<DataStreamPart>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const part of parts) {
          const encoded = encodeDataStreamPart(part);
          controller.enqueue(encoder.encode(encoded + "\n"));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Parse a data stream line
 */
export function parseDataStreamLine(line: string): DataStreamPart | null {
  if (!line || line.length < 2) {
    return null;
  }

  const typeCode = line[0];
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const jsonStr = line.slice(colonIndex + 1);

  try {
    const value = JSON.parse(jsonStr);

    switch (typeCode) {
      case "0":
        return { type: "text", value };
      case "9":
        return { type: "tool_call", value };
      case "a":
        return { type: "tool_result", value };
      case "2":
        return { type: "data", value };
      case "3":
        return { type: "error", value };
      case "d":
        return { type: "finish", value };
      default:
        return { type: "data", value };
    }
  } catch {
    return null;
  }
}

/**
 * Message with persistence metadata
 */
export interface PersistedUIMessage extends UIMessage {
  /** Database message ID */
  dbId?: string;
  /** Conversation ID */
  conversationId?: string;
  /** Token usage */
  tokensUsed?: number;
  /** Whether message has been persisted */
  persisted?: boolean;
}

/**
 * Create a user message for UI
 */
export function createUserMessage(
  content: string,
  options?: {
    id?: string;
    attachments?: UIAttachment[];
  }
): UIMessage {
  return {
    id: options?.id || generateMessageId(),
    role: "user",
    content,
    createdAt: new Date(),
    attachments: options?.attachments,
  };
}

/**
 * Create an assistant message for UI
 */
export function createAssistantMessage(
  content: string,
  options?: {
    id?: string;
    toolInvocations?: UIToolInvocation[];
    annotations?: UIAnnotation[];
  }
): UIMessage {
  return {
    id: options?.id || generateMessageId(),
    role: "assistant",
    content,
    createdAt: new Date(),
    toolInvocations: options?.toolInvocations,
    annotations: options?.annotations,
  };
}

/**
 * Create a system message for UI
 */
export function createSystemMessage(
  content: string,
  options?: {
    id?: string;
  }
): UIMessage {
  return {
    id: options?.id || generateMessageId(),
    role: "system",
    content,
    createdAt: new Date(),
  };
}

export default {
  generateMessageId,
  toUIMessage,
  fromUIMessage,
  toUIMessages,
  fromUIMessages,
  createTextPart,
  createToolCallPart,
  createToolResultPart,
  createDataPart,
  createFinishPart,
  createDataStream,
  parseDataStreamLine,
  createUserMessage,
  createAssistantMessage,
  createSystemMessage,
};
