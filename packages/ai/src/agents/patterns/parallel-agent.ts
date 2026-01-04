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
  AggregatorConfig,
  ParallelAgentConfig,
} from "../config";
import { createAgentFromConfig } from "./factory";

export class ParallelAgent extends BaseAgent {
  readonly config: ParallelAgentConfig;

  constructor(config: ParallelAgentConfig) {
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
      const promises = this.config.subAgents.map((subConfig) => {
        const subAgent = createAgentFromConfig(subConfig);
        return subAgent.execute(input, {
          ...ctx,
          parentTrace: trace,
        });
      });

      const results = await Promise.all(promises);
      const outputs = results.map((r) => r.output);
      const aggregated = this.aggregate(outputs, this.config.aggregator);

      persistOutput(this.config, ctx.state, aggregated);
      completeTrace(trace, aggregated);

      return this.buildResult(aggregated, ctx.state, trace);
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
      const subAgents = this.config.subAgents.map((subConfig) =>
        createAgentFromConfig(subConfig)
      );

      const outputs: unknown[] = new Array(subAgents.length);
      const completedFlags: boolean[] = new Array(subAgents.length).fill(false);

      const streamGenerators = subAgents.map((subAgent, index) => ({
        index,
        generator: subAgent.stream
          ? subAgent.stream(input, { ...ctx, parentTrace: trace })
          : this.wrapExecuteAsStream(subAgent, input, {
              ...ctx,
              parentTrace: trace,
            }),
      }));

      const activeStreams = new Set(streamGenerators);

      while (activeStreams.size > 0) {
        const nextPromises = Array.from(activeStreams).map(async (s) => {
          const { value: v, done: d } = await s.generator.next();
          return { stream: s, value: v, done: d };
        });

        const { stream, value, done } = await Promise.race(nextPromises);

        if (done) {
          activeStreams.delete(stream);
          continue;
        }

        const chunk = value as AgentStreamChunk;
        yield {
          ...chunk,
          agentName: `${this.config.name}/${chunk.agentName}`,
        };

        if (chunk.type === "done" && chunk.result) {
          outputs[stream.index] = chunk.result.output;
          completedFlags[stream.index] = true;
        }
      }

      const aggregated = this.aggregate(outputs, this.config.aggregator);
      persistOutput(this.config, ctx.state, aggregated);
      completeTrace(trace, aggregated);

      yield {
        type: "done",
        agentName: this.config.name,
        result: this.buildResult(aggregated, ctx.state, trace),
      };
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  private async *wrapExecuteAsStream(
    agent: {
      execute: (
        input: unknown,
        ctx: AgentExecutionContext
      ) => Promise<AgentExecutionResult>;
      config: { name: string };
    },
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const result = await agent.execute(input, ctx);
    yield {
      type: "done",
      agentName: agent.config.name,
      result,
    };
  }

  private aggregate(outputs: unknown[], config?: AggregatorConfig): unknown {
    const strategy = config?.strategy ?? "merge";

    switch (strategy) {
      case "merge":
        return this.mergeOutputs(outputs);
      case "concat":
        return this.concatOutputs(outputs);
      case "first":
        return outputs[0];
      case "custom":
        return outputs;
      default:
        return this.mergeOutputs(outputs);
    }
  }

  private mergeOutputs(outputs: unknown[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i];
      const config = this.config.subAgents[i];
      const key = config?.state?.outputKey ?? config?.name ?? `output_${i}`;

      merged[key] = output;
    }

    return merged;
  }

  private concatOutputs(outputs: unknown[]): string {
    return outputs
      .map((o) => (typeof o === "string" ? o : JSON.stringify(o)))
      .join("\n\n---\n\n");
  }
}

export function createParallelAgent(
  config: ParallelAgentConfig
): ParallelAgent {
  return new ParallelAgent(config);
}
