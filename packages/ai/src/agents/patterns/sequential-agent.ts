import {
  type AgentStreamChunk,
  BaseAgent,
  completeTrace,
  createTrace,
  failTrace,
  persistOutput,
} from "../base";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  SequentialAgentConfig,
} from "../config";
import { createAgentFromConfig } from "./factory";

export class SequentialAgent extends BaseAgent {
  readonly config: SequentialAgentConfig;

  constructor(config: SequentialAgentConfig) {
    super(config);
    this.config = config;
  }

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    let currentInput = input;

    try {
      for (const subConfig of this.config.subAgents) {
        const subAgent = createAgentFromConfig(subConfig);

        const subResult = await subAgent.execute(currentInput, {
          ...ctx,
          parentTrace: trace,
        });

        currentInput = subResult.output;
      }

      persistOutput(this.config, ctx.state, currentInput);
      completeTrace(trace, currentInput);

      return this.buildResult(currentInput, ctx.state, trace);
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    let currentInput = input;

    try {
      for (const subConfig of this.config.subAgents) {
        const subAgent = createAgentFromConfig(subConfig);

        if (subAgent.stream) {
          for await (const chunk of subAgent.stream(currentInput, {
            ...ctx,
            parentTrace: trace,
          })) {
            yield {
              ...chunk,
              agentName: `${this.config.name}/${chunk.agentName}`,
            };

            if (chunk.type === "done" && chunk.result) {
              currentInput = chunk.result.output;
            }
          }
        } else {
          const subResult = await subAgent.execute(currentInput, {
            ...ctx,
            parentTrace: trace,
          });
          currentInput = subResult.output;

          yield {
            type: "step",
            agentName: this.config.name,
            step: subResult.trace,
          };
        }
      }

      persistOutput(this.config, ctx.state, currentInput);
      completeTrace(trace, currentInput);

      yield {
        type: "done",
        agentName: this.config.name,
        result: this.buildResult(currentInput, ctx.state, trace),
      };
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }
}

export function createSequentialAgent(
  config: SequentialAgentConfig
): SequentialAgent {
  return new SequentialAgent(config);
}
