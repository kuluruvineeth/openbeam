import type { AgentStreamChunk, ExecutableAgent } from "../base";
import {
  aggregateTokens,
  calculateDuration,
  completeTrace,
  failTrace,
} from "../base";
import type {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionResult,
  AgentState,
  ExecutionTrace,
} from "../config";
import { setStateValue } from "../config";
import { createAgentFromConfig } from "./factory";

export interface GeneratorCriticConfig {
  type?: "generator-critic";
  name: string;
  description?: string;
  generator: AgentConfig;
  critic: AgentConfig;
  maxIterations?: number;
  qualityThreshold?: number;
  exitCondition?: ExitConditionConfig;
  state?: {
    outputKey?: string;
    inputRefs?: string[];
  };
}

export interface ExitConditionConfig {
  type: "expression" | "quality-score" | "pass-string";
  expression?: string;
  threshold?: number;
}

interface CritiqueResult {
  passed: boolean;
  score?: number;
  feedback?: string;
  reason?: string;
}

const DEFAULT_MAX_ITERATIONS = 3;
const DEFAULT_QUALITY_THRESHOLD = 0.8;

export class GeneratorCriticAgent implements ExecutableAgent {
  readonly config: AgentConfig;
  private readonly gcConfig: GeneratorCriticConfig;

  constructor(config: GeneratorCriticConfig) {
    this.gcConfig = config;
    this.config = {
      type: "loop",
      name: config.name,
      description: config.description,
      subAgents: [config.generator, config.critic],
      maxIterations: config.maxIterations ?? DEFAULT_MAX_ITERATIONS,
      state: config.state,
    };
  }

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = this.createGCTrace(ctx.parentTrace);
    trace.input = input;

    const maxIterations = this.gcConfig.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    let iteration = 0;
    let currentDraft: unknown = null;
    let lastCritique: CritiqueResult | null = null;
    let feedback: string | undefined;

    try {
      while (iteration < maxIterations) {
        iteration += 1;

        const generatorInput = this.buildGeneratorInput(input, feedback);
        const generatorResult = await this.runGenerator(
          generatorInput,
          ctx,
          trace
        );
        currentDraft = generatorResult.output;

        const criticResult = await this.runCritic(currentDraft, ctx, trace);
        lastCritique = this.parseCritiqueResult(criticResult.output);

        if (this.shouldExit(lastCritique, iteration)) {
          break;
        }

        feedback = lastCritique.feedback ?? String(criticResult.output);
      }

      const finalOutput = {
        draft: currentDraft,
        critique: lastCritique,
        iterations: iteration,
        passed: lastCritique?.passed ?? false,
      };

      this.persistOutput(ctx.state, finalOutput);
      completeTrace(trace, finalOutput);

      return this.buildResult(finalOutput, ctx.state, trace);
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = this.createGCTrace(ctx.parentTrace);
    trace.input = input;

    const maxIterations = this.gcConfig.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    let iteration = 0;
    let currentDraft: unknown = null;
    let lastCritique: CritiqueResult | null = null;
    let feedback: string | undefined;

    try {
      while (iteration < maxIterations) {
        iteration += 1;

        yield {
          type: "step",
          agentName: this.gcConfig.name,
          content: `Iteration ${iteration}/${maxIterations}: Generating...`,
        };

        const generatorInput = this.buildGeneratorInput(input, feedback);
        const generator = createAgentFromConfig(this.gcConfig.generator);

        if (generator.stream) {
          for await (const chunk of generator.stream(generatorInput, {
            ...ctx,
            parentTrace: trace,
          })) {
            yield {
              ...chunk,
              agentName: `${this.gcConfig.name}/generator`,
            };

            if (chunk.type === "done" && chunk.result) {
              currentDraft = chunk.result.output;
            }
          }
        } else {
          const result = await generator.execute(generatorInput, {
            ...ctx,
            parentTrace: trace,
          });
          currentDraft = result.output;
        }

        yield {
          type: "step",
          agentName: this.gcConfig.name,
          content: `Iteration ${iteration}/${maxIterations}: Critiquing...`,
        };

        const critic = createAgentFromConfig(this.gcConfig.critic);
        let criticOutput: unknown;

        if (critic.stream) {
          for await (const chunk of critic.stream(currentDraft, {
            ...ctx,
            parentTrace: trace,
          })) {
            yield {
              ...chunk,
              agentName: `${this.gcConfig.name}/critic`,
            };

            if (chunk.type === "done" && chunk.result) {
              criticOutput = chunk.result.output;
            }
          }
        } else {
          const result = await critic.execute(currentDraft, {
            ...ctx,
            parentTrace: trace,
          });
          criticOutput = result.output;
        }

        lastCritique = this.parseCritiqueResult(criticOutput);

        if (this.shouldExit(lastCritique, iteration)) {
          yield {
            type: "step",
            agentName: this.gcConfig.name,
            content: lastCritique.passed
              ? `Quality gate passed after ${iteration} iteration(s)`
              : "Max iterations reached",
          };
          break;
        }

        feedback = lastCritique.feedback ?? String(criticOutput);
      }

      const finalOutput = {
        draft: currentDraft,
        critique: lastCritique,
        iterations: iteration,
        passed: lastCritique?.passed ?? false,
      };

      this.persistOutput(ctx.state, finalOutput);
      completeTrace(trace, finalOutput);

      yield {
        type: "done",
        agentName: this.gcConfig.name,
        result: this.buildResult(finalOutput, ctx.state, trace),
      };
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  private createGCTrace(parentTrace?: ExecutionTrace): ExecutionTrace {
    const trace: ExecutionTrace = {
      agentName: this.gcConfig.name,
      type: "loop",
      startTime: Date.now(),
      status: "running",
      children: [],
    };

    if (parentTrace) {
      parentTrace.children.push(trace);
    }

    return trace;
  }

  private buildGeneratorInput(input: unknown, feedback?: string): unknown {
    if (!feedback) {
      return input;
    }

    if (typeof input === "string") {
      return `${input}\n\n## Previous Feedback\n${feedback}`;
    }

    return {
      ...(typeof input === "object" && input !== null ? input : { input }),
      feedback,
    };
  }

  private runGenerator(
    input: unknown,
    ctx: AgentExecutionContext,
    parentTrace: ExecutionTrace
  ): Promise<AgentExecutionResult> {
    const generator = createAgentFromConfig(this.gcConfig.generator);
    return generator.execute(input, {
      ...ctx,
      parentTrace,
    });
  }

  private runCritic(
    draft: unknown,
    ctx: AgentExecutionContext,
    parentTrace: ExecutionTrace
  ): Promise<AgentExecutionResult> {
    const critic = createAgentFromConfig(this.gcConfig.critic);
    return critic.execute(draft, {
      ...ctx,
      parentTrace,
    });
  }

  private parseCritiqueResult(output: unknown): CritiqueResult {
    if (typeof output === "string") {
      const upperOutput = output.toUpperCase().trim();
      if (upperOutput === "PASS" || upperOutput.startsWith("PASS:")) {
        return { passed: true, reason: output };
      }
      return { passed: false, feedback: output };
    }

    if (typeof output === "object" && output !== null) {
      const obj = output as Record<string, unknown>;

      if ("passed" in obj && typeof obj.passed === "boolean") {
        return {
          passed: obj.passed,
          score: typeof obj.score === "number" ? obj.score : undefined,
          feedback: typeof obj.feedback === "string" ? obj.feedback : undefined,
          reason: typeof obj.reason === "string" ? obj.reason : undefined,
        };
      }

      if ("score" in obj && typeof obj.score === "number") {
        const threshold =
          this.gcConfig.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD;
        return {
          passed: obj.score >= threshold,
          score: obj.score,
          feedback: typeof obj.feedback === "string" ? obj.feedback : undefined,
        };
      }

      if ("verdict" in obj && typeof obj.verdict === "string") {
        return {
          passed: obj.verdict.toUpperCase() === "PASS",
          feedback: typeof obj.feedback === "string" ? obj.feedback : undefined,
        };
      }
    }

    return { passed: false, feedback: String(output) };
  }

  private shouldExit(critique: CritiqueResult, iteration: number): boolean {
    if (critique.passed) {
      return true;
    }

    const exitConfig = this.gcConfig.exitCondition;
    if (!exitConfig) {
      return false;
    }

    switch (exitConfig.type) {
      case "quality-score":
        return (
          critique.score !== undefined &&
          critique.score >= (exitConfig.threshold ?? DEFAULT_QUALITY_THRESHOLD)
        );
      case "pass-string":
        return critique.passed;
      case "expression":
        return this.evaluateExpression(
          exitConfig.expression,
          critique,
          iteration
        );
      default:
        return false;
    }
  }

  private evaluateExpression(
    expression: string | undefined,
    critique: CritiqueResult,
    iteration: number
  ): boolean {
    if (!expression) {
      return false;
    }

    if (expression === "critique.passed") {
      return critique.passed;
    }

    if (expression.startsWith("critique.score >= ")) {
      const threshold = Number.parseFloat(expression.slice(18));
      return critique.score !== undefined && critique.score >= threshold;
    }

    if (expression.startsWith("iteration >= ")) {
      const maxIter = Number.parseInt(expression.slice(13), 10);
      return iteration >= maxIter;
    }

    return false;
  }

  private persistOutput(state: AgentState, output: unknown): void {
    const outputKey = this.gcConfig.state?.outputKey ?? this.gcConfig.name;
    setStateValue(state, this.gcConfig.name, outputKey, output);
  }

  private buildResult(
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

export function createGeneratorCriticAgent(
  config: GeneratorCriticConfig
): GeneratorCriticAgent {
  return new GeneratorCriticAgent(config);
}

export function isGeneratorCriticConfig(
  config: unknown
): config is GeneratorCriticConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "generator" in config &&
    "critic" in config
  );
}
