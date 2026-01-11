import type { FinishReason } from "ai";
import type { ProviderId } from "../config";
import type { ContextOrchestratorOptions } from "../context/orchestrator";
import type { MemoryAccess } from "../memory/access";

export type AgentType =
  | "llm"
  | "sequential"
  | "parallel"
  | "coordinator"
  | "loop"
  | "generator-critic"
  | "human-in-loop"
  | "hierarchical";

export interface ModelConfig {
  providerId?: ProviderId;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StateConfig {
  outputKey?: string;
  inputRefs?: string[];
}

export interface AgentBaseConfig {
  name: string;
  description?: string;
  state?: StateConfig;
}

export interface LlmAgentConfig extends AgentBaseConfig {
  type: "llm";
  model?: ModelConfig;
  systemPrompt?: string;
  tools?: string[];
  maxSteps?: number;
  contextConfig?: Partial<ContextOrchestratorOptions>;
}

export interface SequentialAgentConfig extends AgentBaseConfig {
  type: "sequential";
  subAgents: AgentConfig[];
}

export interface ParallelAgentConfig extends AgentBaseConfig {
  type: "parallel";
  subAgents: AgentConfig[];
  aggregator?: AggregatorConfig;
}

export interface CoordinatorAgentConfig extends AgentBaseConfig {
  type: "coordinator";
  subAgents: (AgentConfig & { matchCondition?: string })[];
  defaultAgent?: string;
}

export interface LoopAgentConfig extends AgentBaseConfig {
  type: "loop";
  subAgents: AgentConfig[];
  maxIterations?: number;
  stopCondition?: StopCondition;
}

export interface AggregatorConfig {
  strategy: "merge" | "concat" | "first" | "custom";
  customFn?: string;
}

export interface StopCondition {
  type: "expression" | "tool" | "callback";
  expression?: string;
  toolName?: string;
}

export type AgentConfig =
  | LlmAgentConfig
  | SequentialAgentConfig
  | ParallelAgentConfig
  | CoordinatorAgentConfig
  | LoopAgentConfig;

export interface AgentState {
  values: Map<string, unknown>;
  history: AgentStateSnapshot[];
}

export interface AgentStateSnapshot {
  agentName: string;
  outputKey: string;
  value: unknown;
  timestamp: number;
}

export interface ToolCallRecord {
  name: string;
  input: unknown;
  output?: unknown;
  timestamp: number;
  durationMs?: number;
}

export interface ExecutionTrace {
  agentName: string;
  type: AgentType;
  startTime: number;
  endTime?: number;
  status: "running" | "completed" | "failed" | "skipped";
  input?: unknown;
  output?: unknown;
  error?: string;
  children: ExecutionTrace[];
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls?: ToolCallRecord[];
}

export interface AgentExecutionResult {
  output: unknown;
  state: AgentState;
  trace: ExecutionTrace;
  finishReason: FinishReason;
  totalTokens: {
    inputTokens: number;
    outputTokens: number;
  };
  durationMs: number;
}

export interface AgentExecutionContext {
  teamId: string;
  userId: string;
  sessionId?: string;
  accessControl?: string[];
  abortSignal?: AbortSignal;
  parentTrace?: ExecutionTrace;
  state: AgentState;
  metadata?: Record<string, unknown>;
  memory?: MemoryAccess;
}

export function createEmptyState(): AgentState {
  return {
    values: new Map(),
    history: [],
  };
}

export function getStateValue<T>(
  state: AgentState,
  key: string
): T | undefined {
  return state.values.get(key) as T | undefined;
}

export function setStateValue(
  state: AgentState,
  agentName: string,
  key: string,
  value: unknown
): void {
  state.values.set(key, value);
  state.history.push({
    agentName,
    outputKey: key,
    value,
    timestamp: Date.now(),
  });
}

export function resolveInputRefs(
  state: AgentState,
  refs: string[] | undefined
): Record<string, unknown> {
  if (!refs?.length) {
    return {};
  }

  const resolved: Record<string, unknown> = {};
  for (const ref of refs) {
    const value = state.values.get(ref);
    if (value !== undefined) {
      resolved[ref] = value;
    }
  }
  return resolved;
}
