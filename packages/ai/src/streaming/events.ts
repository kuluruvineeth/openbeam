import { z } from "zod";

export const AgentEventTypeSchema = z.enum([
  "thinking",
  "status",
  "tool_call",
  "tool_result",
  "text",
  "error",
  "done",
]);

export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentStatusSchema = z.enum([
  "idle",
  "analyzing",
  "searching",
  "retrieving",
  "synthesizing",
  "verifying",
  "waiting",
]);

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const ToolVisibilitySchema = z.enum(["visible", "ephemeral", "hidden"]);

export type ToolVisibility = z.infer<typeof ToolVisibilitySchema>;

export interface AgentEventBase {
  type: AgentEventType;
  timestamp: number;
  agentName?: string;
}

export interface ThinkingEvent extends AgentEventBase {
  type: "thinking";
  message: string;
}

export interface StatusEvent extends AgentEventBase {
  type: "status";
  status: AgentStatus;
  message: string;
}

export interface ToolCallEvent extends AgentEventBase {
  type: "tool_call";
  toolCallId: string;
  toolName: string;
  toolInput?: unknown;
  displayName: string;
  visibility: ToolVisibility;
}

export interface ToolResultEvent extends AgentEventBase {
  type: "tool_result";
  toolCallId: string;
  toolName: string;
  toolOutput?: unknown;
  durationMs?: number;
  success: boolean;
  sourceCount?: number;
}

export interface TextEvent extends AgentEventBase {
  type: "text";
  content: string;
  isPartial: boolean;
}

export interface ErrorEvent extends AgentEventBase {
  type: "error";
  code: string;
  message: string;
  retryable: boolean;
}

export interface DoneEvent extends AgentEventBase {
  type: "done";
  success: boolean;
  metadata?: Record<string, unknown>;
}

export type AgentEvent =
  | ThinkingEvent
  | StatusEvent
  | ToolCallEvent
  | ToolResultEvent
  | TextEvent
  | ErrorEvent
  | DoneEvent;

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
