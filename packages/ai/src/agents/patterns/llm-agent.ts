import {
  generateText,
  type ModelMessage,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { getConfig } from "../../config";
import { createContextOrchestrator } from "../../context/orchestrator";
import { registry } from "../../providers/registry";
import { toolRegistry } from "../../tools/registry";
import type { ToolContext } from "../../tools/types";
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
  ExecutionTrace,
  LlmAgentConfig,
  ToolCallRecord,
} from "../config";
import { resolveInputRefs } from "../config";

export class LlmAgent extends BaseAgent {
  readonly config: LlmAgentConfig;

  constructor(config: LlmAgentConfig) {
    super(config);
    this.config = config;
  }

  async execute(
    input: unknown,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    const aiConfig = getConfig();
    const providerId =
      this.config.model?.providerId ?? aiConfig.defaultProvider;
    const modelId = this.config.model?.modelId ?? aiConfig.defaultChatModel;
    const model = registry.chatModel(providerId, modelId);

    const orchestrator = createContextOrchestrator({
      maxTokens: this.config.contextConfig?.maxTokens ?? 100_000,
      compactionThreshold:
        this.config.contextConfig?.compactionThreshold ?? 0.7,
      virtualFileThreshold:
        this.config.contextConfig?.virtualFileThreshold ?? 5000,
    });

    const resolvedInputs = resolveInputRefs(
      ctx.state,
      this.config.state?.inputRefs
    );
    const prompt = this.buildPrompt(input, resolvedInputs);
    const messages = this.buildMessages(prompt);

    const maxSteps = this.config.maxSteps ?? aiConfig.agent.maxSteps;
    const toolContext = this.buildToolContext(ctx);
    const tools = this.resolveTools(toolContext);

    try {
      toolRegistry.setCurrentContext(toolContext);

      const result = await generateText({
        model,
        messages,
        tools,
        stopWhen: stepCountIs(maxSteps),
        temperature: this.config.model?.temperature,
        maxOutputTokens:
          this.config.model?.maxTokens ?? aiConfig.agent.maxTokensPerStep,
        abortSignal: ctx.abortSignal,
      });

      const output = result.text;
      const tokens = {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };

      const toolCallRecords = (result.toolCalls ?? []).map((tc) => ({
        toolName: tc.toolName,
        args: "input" in tc ? (tc as { input: unknown }).input : undefined,
      }));
      this.recordToolCalls(trace, toolCallRecords);

      persistOutput(this.config, ctx.state, output);
      completeTrace(trace, output, tokens);

      orchestrator.addAssistantMessage(output);

      return this.buildResult(output, ctx.state, trace);
    } catch (error) {
      failTrace(trace, error as Error);
      throw error;
    } finally {
      toolRegistry.clearCurrentContext();
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Streaming with tool calls requires handling multiple chunk types
  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    const aiConfig = getConfig();
    const providerId =
      this.config.model?.providerId ?? aiConfig.defaultProvider;
    const modelId = this.config.model?.modelId ?? aiConfig.defaultChatModel;
    const model = registry.chatModel(providerId, modelId);

    const resolvedInputs = resolveInputRefs(
      ctx.state,
      this.config.state?.inputRefs
    );
    const prompt = this.buildPrompt(input, resolvedInputs);
    const messages = this.buildMessages(prompt);

    const maxSteps = this.config.maxSteps ?? aiConfig.agent.maxSteps;
    const toolContext = this.buildToolContext(ctx);
    const tools = this.resolveTools(toolContext);

    toolRegistry.setCurrentContext(toolContext);

    try {
      const result = streamText({
        model,
        messages,
        tools,
        stopWhen: stepCountIs(maxSteps),
        temperature: this.config.model?.temperature,
        maxOutputTokens:
          this.config.model?.maxTokens ?? aiConfig.agent.maxTokensPerStep,
        abortSignal: ctx.abortSignal,
      });

      let fullText = "";
      const toolCalls: Array<{ toolName: string; args: unknown }> = [];

      for await (const chunk of result.fullStream) {
        if (chunk.type === "text-delta") {
          const text = "text" in chunk ? chunk.text : "";
          if (text) {
            fullText += text;
            yield {
              type: "text",
              agentName: this.config.name,
              content: text,
            };
          }
        }

        if (chunk.type === "tool-call") {
          const toolCallInput = "input" in chunk ? chunk.input : undefined;
          toolCalls.push({ toolName: chunk.toolName, args: toolCallInput });
          yield {
            type: "tool-call",
            agentName: this.config.name,
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            toolInput: toolCallInput,
          };
        }

        if (chunk.type === "tool-result") {
          const output = "output" in chunk ? chunk.output : undefined;
          yield {
            type: "tool-result",
            agentName: this.config.name,
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

      this.recordToolCalls(trace, toolCalls);
      persistOutput(this.config, ctx.state, fullText);
      completeTrace(trace, fullText, tokens);

      yield {
        type: "done",
        agentName: this.config.name,
        result: this.buildResult(fullText, ctx.state, trace),
      };
    } finally {
      toolRegistry.clearCurrentContext();
    }
  }

  private buildPrompt(
    input: unknown,
    resolvedInputs: Record<string, unknown>
  ): string {
    const parts: string[] = [];

    if (Object.keys(resolvedInputs).length > 0) {
      parts.push("## Context from Previous Steps\n");
      for (const [key, value] of Object.entries(resolvedInputs)) {
        parts.push(`### ${key}\n${JSON.stringify(value, null, 2)}\n`);
      }
      parts.push("\n---\n\n");
    }

    parts.push(typeof input === "string" ? input : JSON.stringify(input));

    return parts.join("");
  }

  private buildMessages(prompt: string): ModelMessage[] {
    const messages: ModelMessage[] = [];

    if (this.config.systemPrompt) {
      messages.push({ role: "system", content: this.config.systemPrompt });
    }

    messages.push({ role: "user", content: prompt });

    return messages;
  }

  private buildToolContext(ctx: AgentExecutionContext): ToolContext {
    return {
      teamId: ctx.teamId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      accessControl: ctx.accessControl,
      abortSignal: ctx.abortSignal,
      metadata: ctx.metadata,
      services: toolRegistry.getServices(),
    };
  }

  private resolveTools(toolContext: ToolContext): ToolSet | undefined {
    if (!this.config.tools?.length) {
      return;
    }

    const toolNames = this.config.tools;

    if (toolNames.length === 1 && toolNames[0] === "*") {
      return toolRegistry.getContextualTools(toolContext);
    }

    const resolved: ToolSet = {};
    for (const name of toolNames) {
      const tool = toolRegistry.getTool(name);
      if (tool) {
        resolved[name] = tool;
      }
    }

    return Object.keys(resolved).length > 0 ? resolved : undefined;
  }

  private recordToolCalls(
    trace: ExecutionTrace,
    toolCalls: Array<{ toolName: string; args: unknown }>
  ): void {
    if (toolCalls.length === 0) {
      return;
    }

    const records: ToolCallRecord[] = toolCalls.map((tc) => ({
      name: tc.toolName,
      input: tc.args,
      timestamp: Date.now(),
    }));

    trace.toolCalls = records;
  }
}

export function createLlmAgent(config: LlmAgentConfig): LlmAgent {
  return new LlmAgent(config);
}
