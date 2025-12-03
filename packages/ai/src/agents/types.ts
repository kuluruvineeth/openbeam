import type { FinishReason } from "ai";
import type { ProviderId } from "../config";

export type AgentTaskType = "research" | "analysis" | "action" | "synthesis";

export interface AgentConfig {
  providerId?: ProviderId;
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxSteps?: number;
  maxTokens?: number;
  onStepFinish?: (event: StepFinishEvent) => void | Promise<void>;
  abortSignal?: AbortSignal;
}

export interface AgentContext {
  teamId: string;
  userId: string;
  conversationId?: string;
  executionId?: string;
  accessControl?: string[];
  abortSignal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface ToolResult {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: unknown;
}

export interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface StepFinishEvent {
  stepType: "initial" | "tool-result" | "continue";
  text: string;
  toolCalls: ToolCallInfo[];
  toolResults: ToolResult[];
  usage: TokenUsage;
  finishReason: FinishReason;
  isContinued: boolean;
}

export interface AgentResult {
  text: string;
  toolCalls: ToolCallInfo[];
  toolResults: ToolResult[];
  stepCount: number;
  usage: TokenUsage;
  finishReason: FinishReason;
  durationMs: number;
}

export type AgentStreamEvent =
  | { type: "text"; content: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; input: unknown }
  | { type: "tool-result"; toolCallId: string; output: unknown }
  | { type: "step-finish"; step: StepFinishEvent }
  | { type: "done"; result: AgentResult };

export interface Agent {
  run(task: string, context: AgentContext): Promise<AgentResult>;
  stream(task: string, context: AgentContext): AsyncGenerator<AgentStreamEvent>;
  getConfig(): AgentConfig;
  withConfig(updates: Partial<AgentConfig>): Agent;
}
