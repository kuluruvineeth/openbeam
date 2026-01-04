import type {
  AgentConfig,
  AgentExecutionResult,
  AgentState,
  ExecutionTrace,
  LlmAgentConfig,
  ToolCallRecord,
} from "./config";
import { createEmptyState } from "./config";
import type { AgentRunnerOptions } from "./runner";
import { createAgentRunner, runAgent, streamAgent } from "./runner";

export interface SimpleAgentOptions {
  name: string;
  systemPrompt: string;
  tools?: string[];
  maxSteps?: number;
  temperature?: number;
}

export function createSimpleAgent(options: SimpleAgentOptions): LlmAgentConfig {
  return {
    type: "llm",
    name: options.name,
    systemPrompt: options.systemPrompt,
    tools: options.tools,
    maxSteps: options.maxSteps ?? 10,
    model: {
      temperature: options.temperature ?? 0.3,
    },
  };
}

export interface SearchAgentOptions {
  teamId: string;
  userId: string;
  accessControl?: string[];
  maxSteps?: number;
}

const SEARCH_AGENT_PROMPT = `You are an enterprise search assistant. Your role is to help users find information across their connected data sources.

Rules:
- Use the search tools to find relevant documents
- Cite sources using [N] notation
- Be concise and direct
- If you can't find relevant information, say so clearly
- Never fabricate information`;

export function createSearchAgent(options: SearchAgentOptions): {
  config: LlmAgentConfig;
  runnerOptions: AgentRunnerOptions;
} {
  const config: LlmAgentConfig = {
    type: "llm",
    name: "search-agent",
    systemPrompt: SEARCH_AGENT_PROMPT,
    tools: ["hybrid-search", "semantic-search", "rag-answer"],
    maxSteps: options.maxSteps ?? 5,
    model: {
      temperature: 0.2,
    },
  };

  const runnerOptions: AgentRunnerOptions = {
    teamId: options.teamId,
    userId: options.userId,
    accessControl: options.accessControl,
  };

  return { config, runnerOptions };
}

export interface AnalysisAgentOptions {
  teamId: string;
  userId: string;
  accessControl?: string[];
  maxSteps?: number;
}

const ANALYSIS_AGENT_PROMPT = `You are a data analysis assistant. Your role is to analyze documents and extract insights.

Rules:
- Use analysis tools to extract entities, classify content, and identify patterns
- Provide structured, actionable insights
- Support claims with evidence from the documents
- Be precise about confidence levels`;

export function createAnalysisAgent(options: AnalysisAgentOptions): {
  config: LlmAgentConfig;
  runnerOptions: AgentRunnerOptions;
} {
  const config: LlmAgentConfig = {
    type: "llm",
    name: "analysis-agent",
    systemPrompt: ANALYSIS_AGENT_PROMPT,
    tools: ["extract-entities", "classify-content", "get-document"],
    maxSteps: options.maxSteps ?? 10,
    model: {
      temperature: 0.1,
    },
  };

  const runnerOptions: AgentRunnerOptions = {
    teamId: options.teamId,
    userId: options.userId,
    accessControl: options.accessControl,
  };

  return { config, runnerOptions };
}

export interface SerializedTrace {
  agentName: string;
  type: string;
  startTime: string;
  endTime?: string;
  durationMs: number;
  status: string;
  error?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls?: Array<{
    name: string;
    durationMs?: number;
  }>;
  children: SerializedTrace[];
}

export function serializeTrace(trace: ExecutionTrace): SerializedTrace {
  const durationMs = trace.endTime
    ? trace.endTime - trace.startTime
    : Date.now() - trace.startTime;

  return {
    agentName: trace.agentName,
    type: trace.type,
    startTime: new Date(trace.startTime).toISOString(),
    endTime: trace.endTime ? new Date(trace.endTime).toISOString() : undefined,
    durationMs,
    status: trace.status,
    error: trace.error,
    tokenUsage: trace.tokenUsage,
    toolCalls: trace.toolCalls?.map((tc) => ({
      name: tc.name,
      durationMs: tc.durationMs,
    })),
    children: trace.children.map(serializeTrace),
  };
}

export function flattenToolCalls(trace: ExecutionTrace): ToolCallRecord[] {
  const calls: ToolCallRecord[] = [];

  if (trace.toolCalls) {
    calls.push(...trace.toolCalls);
  }

  for (const child of trace.children) {
    calls.push(...flattenToolCalls(child));
  }

  return calls;
}

export function calculateTotalDuration(trace: ExecutionTrace): number {
  if (trace.endTime) {
    return trace.endTime - trace.startTime;
  }
  return Date.now() - trace.startTime;
}

export function calculateTotalTokens(trace: ExecutionTrace): {
  inputTokens: number;
  outputTokens: number;
} {
  let inputTokens = trace.tokenUsage?.inputTokens ?? 0;
  let outputTokens = trace.tokenUsage?.outputTokens ?? 0;

  for (const child of trace.children) {
    const childTokens = calculateTotalTokens(child);
    inputTokens += childTokens.inputTokens;
    outputTokens += childTokens.outputTokens;
  }

  return { inputTokens, outputTokens };
}

export function countToolCalls(trace: ExecutionTrace): number {
  let count = trace.toolCalls?.length ?? 0;

  for (const child of trace.children) {
    count += countToolCalls(child);
  }

  return count;
}

export interface AgentMetrics {
  totalDurationMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  toolCallCount: number;
  agentCount: number;
  status: "completed" | "failed" | "running";
}

function mapTraceStatus(status: string): "completed" | "failed" | "running" {
  if (status === "completed") {
    return "completed";
  }
  if (status === "failed") {
    return "failed";
  }
  return "running";
}

export function extractMetrics(result: AgentExecutionResult): AgentMetrics {
  const tokens = calculateTotalTokens(result.trace);
  const agentCount = countAgents(result.trace);

  return {
    totalDurationMs: result.durationMs,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    totalTokens: tokens.inputTokens + tokens.outputTokens,
    toolCallCount: countToolCalls(result.trace),
    agentCount,
    status: mapTraceStatus(result.trace.status),
  };
}

function countAgents(trace: ExecutionTrace): number {
  let count = 1;
  for (const child of trace.children) {
    count += countAgents(child);
  }
  return count;
}

export async function executeWithTimeout(
  config: AgentConfig,
  input: unknown,
  options: AgentRunnerOptions & { timeoutMs: number }
): Promise<AgentExecutionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const result = await runAgent(config, input, {
      ...options,
      abortSignal: controller.signal,
    });
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function cloneState(state: AgentState): AgentState {
  return {
    values: new Map(state.values),
    history: [...state.history],
  };
}

export function mergeStates(
  base: AgentState,
  ...others: AgentState[]
): AgentState {
  const merged = cloneState(base);

  for (const other of others) {
    for (const [key, value] of other.values) {
      merged.values.set(key, value);
    }
    merged.history.push(...other.history);
  }

  merged.history.sort((a, b) => a.timestamp - b.timestamp);

  return merged;
}

export { createAgentRunner, createEmptyState, runAgent, streamAgent };
