import type { AgentStreamChunk } from "./base";
import type {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionResult,
  AgentState,
} from "./config";
import { createEmptyState } from "./config";
import { createAgentFromConfig } from "./patterns/factory";

export interface AgentRunnerOptions {
  teamId: string;
  userId: string;
  sessionId?: string;
  accessControl?: string[];
  initialState?: AgentState;
  abortSignal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface AgentRunner {
  execute(input: unknown): Promise<AgentExecutionResult>;
  stream(input: unknown): AsyncGenerator<AgentStreamChunk>;
  getState(): AgentState;
  resetState(): void;
}

export function createAgentRunner(
  config: AgentConfig,
  options: AgentRunnerOptions
): AgentRunner {
  const agent = createAgentFromConfig(config);
  let state = options.initialState ?? createEmptyState();

  function buildContext(): AgentExecutionContext {
    return {
      teamId: options.teamId,
      userId: options.userId,
      sessionId: options.sessionId,
      accessControl: options.accessControl,
      abortSignal: options.abortSignal,
      state,
      metadata: options.metadata,
    };
  }

  return {
    async execute(input: unknown): Promise<AgentExecutionResult> {
      const ctx = buildContext();
      const result = await agent.execute(input, ctx);
      state = result.state;
      return result;
    },

    async *stream(input: unknown): AsyncGenerator<AgentStreamChunk> {
      const ctx = buildContext();

      if (!agent.stream) {
        const result = await agent.execute(input, ctx);
        state = result.state;
        yield { type: "done", agentName: config.name, result };
        return;
      }

      for await (const chunk of agent.stream(input, ctx)) {
        if (chunk.type === "done" && chunk.result) {
          state = chunk.result.state;
        }
        yield chunk;
      }
    },

    getState(): AgentState {
      return state;
    },

    resetState(): void {
      state = createEmptyState();
    },
  };
}

export function runAgent(
  config: AgentConfig,
  input: unknown,
  options: AgentRunnerOptions
): Promise<AgentExecutionResult> {
  const runner = createAgentRunner(config, options);
  return runner.execute(input);
}

export async function* streamAgent(
  config: AgentConfig,
  input: unknown,
  options: AgentRunnerOptions
): AsyncGenerator<AgentStreamChunk> {
  const runner = createAgentRunner(config, options);
  const generator = runner.stream(input);
  for await (const chunk of generator) {
    yield chunk;
  }
}

export function composeAgents(
  name: string,
  agents: AgentConfig[]
): AgentConfig {
  return {
    type: "sequential",
    name,
    subAgents: agents,
  };
}

export function parallelizeAgents(
  name: string,
  agents: AgentConfig[]
): AgentConfig {
  return {
    type: "parallel",
    name,
    subAgents: agents,
  };
}

export function routeAgents(
  name: string,
  agents: (AgentConfig & { matchCondition?: string })[],
  defaultAgent?: string
): AgentConfig {
  return {
    type: "coordinator",
    name,
    subAgents: agents,
    defaultAgent,
  };
}

export function loopAgent(
  name: string,
  agents: AgentConfig[],
  options?: {
    maxIterations?: number;
    stopCondition?: AgentConfig["type"] extends "loop" ? AgentConfig : never;
  }
): AgentConfig {
  return {
    type: "loop",
    name,
    subAgents: agents,
    maxIterations: options?.maxIterations,
  };
}
