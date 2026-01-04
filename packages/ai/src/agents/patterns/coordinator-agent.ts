import {
  type AgentStreamChunk,
  BaseAgent,
  completeTrace,
  createTrace,
  failTrace,
  persistOutput,
} from "../base";
import type {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionResult,
  CoordinatorAgentConfig,
} from "../config";
import { createAgentFromConfig } from "./factory";

type CoordinatorSubAgentConfig = AgentConfig & { matchCondition?: string };

export class CoordinatorAgent extends BaseAgent {
  readonly config: CoordinatorAgentConfig;

  constructor(config: CoordinatorAgentConfig) {
    super(config);
    this.config = config;
  }

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    try {
      const selectedConfig = this.selectAgent(input);

      if (!selectedConfig) {
        const output = { error: "No matching agent found", input };
        completeTrace(trace, output);
        return this.buildResult(output, ctx.state, trace);
      }

      const selectedAgent = createAgentFromConfig(selectedConfig);
      const result = await selectedAgent.execute(input, {
        ...ctx,
        parentTrace: trace,
      });

      persistOutput(this.config, ctx.state, result.output);
      completeTrace(trace, result.output);

      return this.buildResult(result.output, ctx.state, trace);
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

    try {
      const selectedConfig = this.selectAgent(input);

      if (!selectedConfig) {
        const output = { error: "No matching agent found", input };
        completeTrace(trace, output);
        yield {
          type: "done",
          agentName: this.config.name,
          result: this.buildResult(output, ctx.state, trace),
        };
        return;
      }

      yield {
        type: "step",
        agentName: this.config.name,
        content: `Routing to: ${selectedConfig.name}`,
      };

      const selectedAgent = createAgentFromConfig(selectedConfig);

      if (selectedAgent.stream) {
        let finalOutput: unknown;
        for await (const chunk of selectedAgent.stream(input, {
          ...ctx,
          parentTrace: trace,
        })) {
          yield {
            ...chunk,
            agentName: `${this.config.name}/${chunk.agentName}`,
          };

          if (chunk.type === "done" && chunk.result) {
            finalOutput = chunk.result.output;
          }
        }

        persistOutput(this.config, ctx.state, finalOutput);
        completeTrace(trace, finalOutput);

        yield {
          type: "done",
          agentName: this.config.name,
          result: this.buildResult(finalOutput, ctx.state, trace),
        };
      } else {
        const result = await selectedAgent.execute(input, {
          ...ctx,
          parentTrace: trace,
        });

        persistOutput(this.config, ctx.state, result.output);
        completeTrace(trace, result.output);

        yield {
          type: "done",
          agentName: this.config.name,
          result: this.buildResult(result.output, ctx.state, trace),
        };
      }
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  private selectAgent(input: unknown): CoordinatorSubAgentConfig | undefined {
    for (const subConfig of this.config.subAgents) {
      if (this.matchesCondition(input, subConfig.matchCondition)) {
        return subConfig;
      }
    }

    if (this.config.defaultAgent) {
      return this.config.subAgents.find(
        (s) => s.name === this.config.defaultAgent
      );
    }

    return this.config.subAgents[0];
  }

  private matchesCondition(input: unknown, condition?: string): boolean {
    if (!condition) {
      return true;
    }

    const inputStr = typeof input === "string" ? input : JSON.stringify(input);
    const inputLower = inputStr.toLowerCase();

    if (condition.startsWith("contains:")) {
      const term = condition.slice(9).toLowerCase();
      return inputLower.includes(term);
    }

    if (condition.startsWith("startsWith:")) {
      const prefix = condition.slice(11).toLowerCase();
      return inputLower.startsWith(prefix);
    }

    if (condition.startsWith("matches:")) {
      const pattern = condition.slice(8);
      try {
        const regex = new RegExp(pattern, "i");
        return regex.test(inputStr);
      } catch {
        return false;
      }
    }

    if (condition.startsWith("type:")) {
      const expectedType = condition.slice(5);
      if (typeof input === "object" && input !== null) {
        return (input as { type?: string }).type === expectedType;
      }
      return false;
    }

    return inputLower.includes(condition.toLowerCase());
  }
}

export function createCoordinatorAgent(
  config: CoordinatorAgentConfig
): CoordinatorAgent {
  return new CoordinatorAgent(config);
}
