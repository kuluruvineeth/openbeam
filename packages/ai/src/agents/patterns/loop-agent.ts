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
  LoopAgentConfig,
  StopCondition,
} from "../config";
import { createAgentFromConfig } from "./factory";

const DEFAULT_MAX_ITERATIONS = 10;

export class LoopAgent extends BaseAgent {
  readonly config: LoopAgentConfig;

  constructor(config: LoopAgentConfig) {
    super(config);
    this.config = config;
  }

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    const maxIterations = this.config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    let currentInput = input;
    let iteration = 0;

    try {
      while (iteration < maxIterations) {
        iteration += 1;

        for (const subConfig of this.config.subAgents) {
          const subAgent = createAgentFromConfig(subConfig);
          const subResult = await subAgent.execute(currentInput, {
            ...ctx,
            parentTrace: trace,
          });
          currentInput = subResult.output;
        }

        if (
          this.shouldStop(currentInput, iteration, this.config.stopCondition)
        ) {
          break;
        }
      }

      persistOutput(this.config, ctx.state, currentInput);
      completeTrace(trace, currentInput);

      return this.buildResult(currentInput, ctx.state, trace);
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Streaming with iteration tracking requires this complexity
  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    const maxIterations = this.config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    let currentInput = input;
    let iteration = 0;

    try {
      while (iteration < maxIterations) {
        iteration += 1;

        yield {
          type: "step",
          agentName: this.config.name,
          content: `Iteration ${iteration}/${maxIterations}`,
        };

        for (const subConfig of this.config.subAgents) {
          const subAgent = createAgentFromConfig(subConfig);

          if (subAgent.stream) {
            for await (const chunk of subAgent.stream(currentInput, {
              ...ctx,
              parentTrace: trace,
            })) {
              yield {
                ...chunk,
                agentName: `${this.config.name}[${iteration}]/${chunk.agentName}`,
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

        if (
          this.shouldStop(currentInput, iteration, this.config.stopCondition)
        ) {
          break;
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

  private shouldStop(
    output: unknown,
    iteration: number,
    condition?: StopCondition
  ): boolean {
    if (!condition) {
      return false;
    }

    switch (condition.type) {
      case "expression":
        return this.evaluateExpression(output, iteration, condition.expression);
      case "tool":
        return this.checkToolResult(output, condition.toolName);
      case "callback":
        return false;
      default:
        return false;
    }
  }

  private evaluateExpression(
    output: unknown,
    iteration: number,
    expression?: string
  ): boolean {
    if (!expression) {
      return false;
    }

    if (
      expression === "output.done === true" &&
      typeof output === "object" &&
      output !== null
    ) {
      return (output as { done?: boolean }).done === true;
    }

    if (
      expression === "output.quality >= 0.8" &&
      typeof output === "object" &&
      output !== null
    ) {
      return ((output as { quality?: number }).quality ?? 0) >= 0.8;
    }

    if (expression === "iteration >= 3") {
      return iteration >= 3;
    }

    return false;
  }

  private checkToolResult(output: unknown, toolName?: string): boolean {
    if (!toolName || typeof output !== "object" || output === null) {
      return false;
    }

    const result = output as { toolName?: string; shouldStop?: boolean };
    return result.toolName === toolName && result.shouldStop === true;
  }
}

export function createLoopAgent(config: LoopAgentConfig): LoopAgent {
  return new LoopAgent(config);
}
