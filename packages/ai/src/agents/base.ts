import type {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionResult,
  AgentState,
  ExecutionTrace,
} from "./config";
import { setStateValue } from "./config";

export interface ExecutableAgent {
  readonly config: AgentConfig;
  execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult>;
  stream?(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk>;
}

export interface AgentStreamChunk {
  type: "text" | "tool-call" | "tool-result" | "step" | "done";
  agentName: string;
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  step?: ExecutionTrace;
  result?: AgentExecutionResult;
}

export interface AgentFactory {
  create(config: AgentConfig): ExecutableAgent;
}

export function createTrace(
  config: AgentConfig,
  parentTrace?: ExecutionTrace
): ExecutionTrace {
  const trace: ExecutionTrace = {
    agentName: config.name,
    type: config.type,
    startTime: Date.now(),
    status: "running",
    children: [],
  };

  if (parentTrace) {
    parentTrace.children.push(trace);
  }

  return trace;
}

export function completeTrace(
  trace: ExecutionTrace,
  output: unknown,
  tokens?: { inputTokens: number; outputTokens: number }
): void {
  trace.endTime = Date.now();
  trace.status = "completed";
  trace.output = output;
  if (tokens) {
    trace.tokenUsage = tokens;
  }
}

export function failTrace(trace: ExecutionTrace, error: Error): void {
  trace.endTime = Date.now();
  trace.status = "failed";
  trace.error = error.message;
}

export function skipTrace(trace: ExecutionTrace): void {
  trace.endTime = Date.now();
  trace.status = "skipped";
}

export function persistOutput(
  config: AgentConfig,
  state: AgentState,
  output: unknown
): void {
  const outputKey = config.state?.outputKey ?? config.name;
  setStateValue(state, config.name, outputKey, output);
}

export function aggregateTokens(traces: ExecutionTrace[]): {
  inputTokens: number;
  outputTokens: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const trace of traces) {
    if (trace.tokenUsage) {
      inputTokens += trace.tokenUsage.inputTokens;
      outputTokens += trace.tokenUsage.outputTokens;
    }
    const childTokens = aggregateTokens(trace.children);
    inputTokens += childTokens.inputTokens;
    outputTokens += childTokens.outputTokens;
  }

  return { inputTokens, outputTokens };
}

export function calculateDuration(trace: ExecutionTrace): number {
  if (!trace.endTime) {
    return Date.now() - trace.startTime;
  }
  return trace.endTime - trace.startTime;
}

export abstract class BaseAgent implements ExecutableAgent {
  readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  abstract execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult>;

  protected buildResult(
    output: unknown,
    state: AgentState,
    trace: ExecutionTrace
  ): AgentExecutionResult {
    const tokens = aggregateTokens([trace]);
    return {
      output,
      state,
      trace,
      finishReason: trace.status === "completed" ? "stop" : "error",
      totalTokens: tokens,
      durationMs: calculateDuration(trace),
    };
  }
}

export function isLlmConfig(
  config: AgentConfig
): config is AgentConfig & { type: "llm" } {
  return config.type === "llm";
}

export function isSequentialConfig(
  config: AgentConfig
): config is AgentConfig & { type: "sequential" } {
  return config.type === "sequential";
}

export function isParallelConfig(
  config: AgentConfig
): config is AgentConfig & { type: "parallel" } {
  return config.type === "parallel";
}

export function isCoordinatorConfig(
  config: AgentConfig
): config is AgentConfig & { type: "coordinator" } {
  return config.type === "coordinator";
}

export function isLoopConfig(
  config: AgentConfig
): config is AgentConfig & { type: "loop" } {
  return config.type === "loop";
}
