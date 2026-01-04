import { tool as aiTool, generateText, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { getConfig } from "../../config";
import { registry } from "../../providers/registry";
import { toolRegistry } from "../../tools/registry";
import type { ToolContext } from "../../tools/types";
import {
  type AgentStreamChunk,
  aggregateTokens,
  calculateDuration,
  completeTrace,
  createTrace,
  type ExecutableAgent,
  failTrace,
} from "../base";
import type {
  AgentBaseConfig,
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionResult,
  AgentState,
  ExecutionTrace,
  ModelConfig,
  ToolCallRecord,
} from "../config";
import { setStateValue } from "../config";
import { createAgentFromConfig } from "./factory";

export interface HierarchicalConfig extends AgentBaseConfig {
  type: "hierarchical";
  systemPrompt?: string;
  subAgents: SubAgentConfig[];
  delegationStrategy: "explicit" | "auto";
  maxSteps?: number;
  model?: ModelConfig;
}

export type SubAgentConfig = AgentConfig & {
  delegationDescription?: string;
};

interface AgentToolDefinition {
  name: string;
  description: string;
  agent: ExecutableAgent;
  config: SubAgentConfig;
}

const DEFAULT_MAX_STEPS = 10;

export class HierarchicalAgent implements ExecutableAgent {
  readonly config: AgentConfig;
  private readonly hConfig: HierarchicalConfig;
  private readonly agentTools: Map<string, AgentToolDefinition>;

  constructor(config: HierarchicalConfig) {
    this.hConfig = config;
    this.config = {
      type: "llm",
      name: config.name,
      description: config.description,
      systemPrompt: config.systemPrompt,
      maxSteps: config.maxSteps,
      model: config.model,
      state: config.state,
    };
    this.agentTools = new Map();
    this.initializeAgentTools();
  }

  private initializeAgentTools(): void {
    for (const subConfig of this.hConfig.subAgents) {
      const agent = createAgentFromConfig(subConfig);
      const toolName = `delegate_${subConfig.name}`;
      const description =
        subConfig.delegationDescription ??
        subConfig.description ??
        `Delegate task to ${subConfig.name} agent`;

      this.agentTools.set(toolName, {
        name: toolName,
        description,
        agent,
        config: subConfig,
      });
    }
  }

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = this.createHierarchicalTrace(ctx.parentTrace);
    trace.input = input;

    const aiConfig = getConfig();
    const providerId =
      this.hConfig.model?.providerId ?? aiConfig.defaultProvider;
    const modelId = this.hConfig.model?.modelId ?? aiConfig.defaultChatModel;
    const model = registry.chatModel(providerId, modelId);

    const tools = this.buildDelegationTools(ctx, trace);
    const systemPrompt = this.buildSystemPrompt();
    const maxSteps = this.hConfig.maxSteps ?? DEFAULT_MAX_STEPS;

    try {
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: typeof input === "string" ? input : JSON.stringify(input),
        tools,
        stopWhen: stepCountIs(maxSteps),
        temperature: this.hConfig.model?.temperature,
        abortSignal: ctx.abortSignal,
      });

      const output = result.text;
      const tokens = {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };

      const toolCallsForRecord = (result.toolCalls ?? []).map((tc) => ({
        toolName: tc.toolName,
        args: "args" in tc ? tc.args : undefined,
      }));
      this.recordDelegations(trace, toolCallsForRecord);
      this.persistOutput(ctx.state, output);
      completeTrace(trace, output, tokens);

      return this.buildResult(output, ctx.state, trace);
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Hierarchical orchestration requires complex control flow
  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = this.createHierarchicalTrace(ctx.parentTrace);
    trace.input = input;

    const aiConfig = getConfig();
    const providerId =
      this.hConfig.model?.providerId ?? aiConfig.defaultProvider;
    const modelId = this.hConfig.model?.modelId ?? aiConfig.defaultChatModel;
    const model = registry.chatModel(providerId, modelId);

    const tools = this.buildDelegationTools(ctx, trace);
    const systemPrompt = this.buildSystemPrompt();
    const maxSteps = this.hConfig.maxSteps ?? DEFAULT_MAX_STEPS;

    try {
      const result = streamText({
        model,
        system: systemPrompt,
        prompt: typeof input === "string" ? input : JSON.stringify(input),
        tools,
        stopWhen: stepCountIs(maxSteps),
        temperature: this.hConfig.model?.temperature,
        abortSignal: ctx.abortSignal,
      });

      let fullText = "";
      const delegations: Array<{ toolName: string; args: unknown }> = [];

      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          const text = "text" in chunk ? chunk.text : "";
          if (text) {
            fullText += text;
            yield {
              type: "text",
              agentName: this.hConfig.name,
              content: text,
            };
          }
        }

        if (chunk.type === "tool-call") {
          const toolInput = "input" in chunk ? chunk.input : undefined;
          delegations.push({ toolName: chunk.toolName, args: toolInput });

          yield {
            type: "tool-call",
            agentName: this.hConfig.name,
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            toolInput,
          };

          if (chunk.toolName.startsWith("delegate_")) {
            yield {
              type: "step",
              agentName: this.hConfig.name,
              content: `Delegating to: ${chunk.toolName.replace("delegate_", "")}`,
            };
          }
        }

        if (chunk.type === "tool-result") {
          const output = "output" in chunk ? chunk.output : undefined;
          yield {
            type: "tool-result",
            agentName: this.hConfig.name,
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            toolOutput: output,
          };
        }
      }

      const [finalUsage] = await Promise.all([result.usage]);
      const tokens = {
        inputTokens: finalUsage?.inputTokens ?? 0,
        outputTokens: finalUsage?.outputTokens ?? 0,
      };

      this.recordDelegations(trace, delegations);
      this.persistOutput(ctx.state, fullText);
      completeTrace(trace, fullText, tokens);

      yield {
        type: "done",
        agentName: this.hConfig.name,
        result: this.buildResult(fullText, ctx.state, trace),
      };
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    }
  }

  private createHierarchicalTrace(
    parentTrace?: ExecutionTrace
  ): ExecutionTrace {
    const trace: ExecutionTrace = {
      agentName: this.hConfig.name,
      type: "hierarchical",
      startTime: Date.now(),
      status: "running",
      children: [],
    };

    if (parentTrace) {
      parentTrace.children.push(trace);
    }

    return trace;
  }

  private buildSystemPrompt(): string {
    const parts: string[] = [];

    if (this.hConfig.systemPrompt) {
      parts.push(this.hConfig.systemPrompt);
    }

    parts.push("\n## Available Agents for Delegation\n");
    parts.push("You can delegate specialized tasks to the following agents:\n");

    for (const [, def] of this.agentTools) {
      parts.push(`- **${def.config.name}**: ${def.description}`);
    }

    if (this.hConfig.delegationStrategy === "explicit") {
      parts.push(
        "\nUse delegation tools explicitly when a task matches an agent's expertise."
      );
    } else {
      parts.push(
        "\nAutomatically delegate to specialized agents based on task requirements."
      );
    }

    return parts.join("\n");
  }

  private buildDelegationTools(
    ctx: AgentExecutionContext,
    parentTrace: ExecutionTrace
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
    const tools: Record<string, any> = {};

    const delegationSchema = z.object({
      task: z.string().describe("The specific task to delegate"),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Additional context for the agent"),
    });

    for (const [toolName, def] of this.agentTools) {
      const agentDef = def;
      tools[toolName] = aiTool({
        description: def.description,
        inputSchema: delegationSchema,
        execute: async (params: z.infer<typeof delegationSchema>) => {
          const delegationTrace = createTrace(agentDef.config, parentTrace);
          delegationTrace.input = {
            task: params.task,
            context: params.context,
          };

          try {
            const result = await agentDef.agent.execute(params.task, {
              ...ctx,
              parentTrace: delegationTrace,
              metadata: {
                ...ctx.metadata,
                ...params.context,
                delegatedFrom: this.hConfig.name,
              },
            });

            completeTrace(delegationTrace, result.output, result.totalTokens);

            const summary = await this.summarizeResult(result.output);

            return {
              success: true,
              agentName: agentDef.config.name,
              output: summary,
              fullOutput: result.output,
            };
          } catch (error) {
            failTrace(delegationTrace, error as Error);
            return {
              success: false,
              agentName: agentDef.config.name,
              error: (error as Error).message,
            };
          }
        },
      });
    }

    return tools;
  }

  private async summarizeResult(output: unknown): Promise<string> {
    const outputStr =
      typeof output === "string" ? output : JSON.stringify(output);

    if (outputStr.length <= 2000) {
      return outputStr;
    }

    const aiConfig = getConfig();
    const model = registry.chatModel(
      aiConfig.defaultProvider,
      aiConfig.defaultChatModel
    );

    const summary = await generateText({
      model,
      prompt: `Summarize this result concisely (max 500 words):\n\n${outputStr}`,
      maxOutputTokens: 1000,
    });

    return summary.text;
  }

  private recordDelegations(
    trace: ExecutionTrace,
    toolCalls: Array<{ toolName: string; args: unknown }>
  ): void {
    const delegations = toolCalls.filter((tc) =>
      tc.toolName.startsWith("delegate_")
    );

    if (delegations.length === 0) {
      return;
    }

    const records: ToolCallRecord[] = delegations.map((tc) => ({
      name: tc.toolName,
      input: tc.args,
      timestamp: Date.now(),
    }));

    trace.toolCalls = records;
  }

  private persistOutput(state: AgentState, output: unknown): void {
    const outputKey = this.hConfig.state?.outputKey ?? this.hConfig.name;
    setStateValue(state, this.hConfig.name, outputKey, output);
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

export function createHierarchicalAgent(
  config: HierarchicalConfig
): HierarchicalAgent {
  return new HierarchicalAgent(config);
}

export function isHierarchicalConfig(
  config: unknown
): config is HierarchicalConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    (config as { type?: string }).type === "hierarchical"
  );
}

export function wrapAsAgentTool(
  agent: ExecutableAgent,
  options?: {
    name?: string;
    description?: string;
  }
): unknown {
  const agentName = options?.name ?? agent.config.name;
  const description =
    options?.description ??
    agent.config.description ??
    `Execute the ${agentName} agent`;

  const agentToolSchema = z.object({
    task: z.string().describe("The task to delegate to this agent"),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Additional context for the agent"),
  });

  return aiTool({
    description,
    inputSchema: agentToolSchema,
    execute: async (params: z.infer<typeof agentToolSchema>) => {
      const toolContext: ToolContext = {
        teamId: (params.context?.teamId as string) ?? "",
        userId: (params.context?.userId as string) ?? "",
        services: toolRegistry.getServices(),
      };

      const execContext: AgentExecutionContext = {
        teamId: toolContext.teamId,
        userId: toolContext.userId,
        state: {
          values: new Map(),
          history: [],
        },
        metadata: params.context,
      };

      const result = await agent.execute(params.task, execContext);

      return {
        success: true,
        output: result.output,
        tokens: result.totalTokens,
        durationMs: result.durationMs,
      };
    },
  });
}
