import type {
  AgentEvent,
  AgentEventType,
  AgentStatus,
  DoneEvent,
  ErrorEvent,
  StatusEvent,
  TextEvent,
  ThinkingEvent,
  ToolCallEvent,
  ToolResultEvent,
  ToolVisibility,
} from "@openplane/types/ai";

export {
  AgentEventTypeSchema,
  AgentStatusSchema,
  ToolVisibilitySchema,
} from "@openplane/types/ai";

export function createEvent<T extends AgentEventType>(
  type: T,
  data: Omit<Extract<AgentEvent, { type: T }>, "type" | "timestamp">
): Extract<AgentEvent, { type: T }> {
  return {
    type,
    timestamp: Date.now(),
    ...data,
  } as Extract<AgentEvent, { type: T }>;
}

export const thinking = (message: string, agentName?: string): ThinkingEvent =>
  createEvent("thinking", { message, agentName });

export const status = (
  agentStatus: AgentStatus,
  message: string,
  agentName?: string
): StatusEvent =>
  createEvent("status", { status: agentStatus, message, agentName });

export const toolCall = (
  toolCallId: string,
  toolName: string,
  displayName: string,
  options: {
    toolInput?: unknown;
    visibility?: ToolVisibility;
    agentName?: string;
  } = {}
): ToolCallEvent =>
  createEvent("tool_call", {
    toolCallId,
    toolName,
    displayName,
    toolInput: options.toolInput,
    visibility: options.visibility ?? "visible",
    agentName: options.agentName,
  });

export const toolResult = (
  toolCallId: string,
  toolName: string,
  options: {
    toolOutput?: unknown;
    durationMs?: number;
    success?: boolean;
    sourceCount?: number;
    agentName?: string;
  } = {}
): ToolResultEvent =>
  createEvent("tool_result", {
    toolCallId,
    toolName,
    toolOutput: options.toolOutput,
    durationMs: options.durationMs,
    success: options.success ?? true,
    sourceCount: options.sourceCount,
    agentName: options.agentName,
  });

export const text = (
  content: string,
  isPartial = true,
  agentName?: string
): TextEvent => createEvent("text", { content, isPartial, agentName });

export const error = (
  code: string,
  message: string,
  retryable = false,
  agentName?: string
): ErrorEvent => createEvent("error", { code, message, retryable, agentName });

export const done = (
  success: boolean,
  metadata?: Record<string, unknown>,
  agentName?: string
): DoneEvent => createEvent("done", { success, metadata, agentName });
