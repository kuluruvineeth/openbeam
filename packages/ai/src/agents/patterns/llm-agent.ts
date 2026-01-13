import {
  generateText,
  type ModelMessage,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { getConfig } from "../../config";
import { buildContextMd, type ContextMdInput } from "../../context/context-md";
import { createContextOrchestrator } from "../../context/orchestrator";
import {
  type CompositionTracker,
  createCompositionTracker,
} from "../../observability/composition";
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

    const compositionTracker = createCompositionTracker();
    if (ctx.sessionId && ctx.teamId && ctx.userId) {
      compositionTracker.startTracking(ctx.sessionId, ctx.teamId, ctx.userId);
    }

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
    const messages = this.buildMessages(prompt, ctx);

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

      for (const tc of toolCallRecords) {
        compositionTracker.recordToolCall(tc.toolName);
      }

      persistOutput(this.config, ctx.state, output);
      completeTrace(trace, output, tokens);

      orchestrator.addAssistantMessage(output);

      await this.finalizeComposition(compositionTracker, true);

      return this.buildResult(output, ctx.state, trace);
    } catch (error) {
      failTrace(trace, error as Error);
      await this.finalizeComposition(compositionTracker, false);
      throw error;
    } finally {
      toolRegistry.clearCurrentContext();
    }
  }

  private async finalizeComposition(
    tracker: CompositionTracker,
    success: boolean
  ): Promise<void> {
    try {
      await tracker.finalize(success, this.config.name);
    } catch {
      // Composition logging is best-effort, don't fail the agent
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Streaming with tool calls requires handling multiple chunk types
  async *stream(
    input: unknown,
    ctx: AgentExecutionContext
  ): AsyncGenerator<AgentStreamChunk> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    const compositionTracker = createCompositionTracker();
    if (ctx.sessionId && ctx.teamId && ctx.userId) {
      compositionTracker.startTracking(ctx.sessionId, ctx.teamId, ctx.userId);
    }

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
    const messages = this.buildMessages(prompt, ctx);

    const maxSteps = this.config.maxSteps ?? aiConfig.agent.maxSteps;
    const toolContext = this.buildToolContext(ctx);
    const tools = this.resolveTools(toolContext);

    toolRegistry.setCurrentContext(toolContext);

    let streamSuccess = true;
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
          compositionTracker.recordToolCall(chunk.toolName);
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
    } catch (error) {
      streamSuccess = false;
      throw error;
    } finally {
      toolRegistry.clearCurrentContext();
      await this.finalizeComposition(compositionTracker, streamSuccess);
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

  private buildMessages(
    prompt: string,
    ctx: AgentExecutionContext
  ): ModelMessage[] {
    const messages: ModelMessage[] = [];

    const systemContent = this.buildSystemPrompt(ctx);
    if (systemContent) {
      messages.push({ role: "system", content: systemContent });
    }

    messages.push({ role: "user", content: prompt });

    return messages;
  }

  private buildSystemPrompt(ctx: AgentExecutionContext): string | undefined {
    const basePrompt = this.config.systemPrompt ?? "";

    if (!(ctx.memory || this.config.contextConfig?.includeContextMd)) {
      return basePrompt || undefined;
    }

    const contextMd = this.buildContextMdFromExecution(ctx);
    if (!contextMd) {
      return basePrompt || undefined;
    }

    if (!basePrompt) {
      return contextMd;
    }

    return `${basePrompt}\n\n${contextMd}`;
  }

  private buildContextMdFromExecution(
    ctx: AgentExecutionContext
  ): string | null {
    if (!(ctx.teamId && ctx.userId)) {
      return null;
    }

    const memory = ctx.memory;
    const preferences = memory?.preferences ?? {};

    const input: ContextMdInput = {
      identity: {
        teamId: ctx.teamId,
        userId: ctx.userId,
        teamName: (ctx.metadata?.teamName as string | undefined) ?? "Your Team",
        agentRole: this.config.description,
      },
      preferences: {
        responseStyle:
          (preferences.responseStyle as
            | "concise"
            | "detailed"
            | "technical"
            | "casual") ?? "concise",
        prefersBulletPoints: true,
        timezone: preferences.timezone as string | undefined,
        role: preferences.role as string | undefined,
        primaryProject: preferences.primaryProject as string | undefined,
        language: (preferences.language as string) ?? "en",
      },
      resources: [],
      recentActivity: this.buildRecentActivity(ctx),
      guidelines: {
        citationRequired: true,
        flagStaleContent: true,
        staleThresholdDays: 30,
        escalateSecurityQuestions: true,
        customInstructions: [],
      },
      sessionState: {
        activeConversationTopic: (ctx.metadata?.topic as string) ?? undefined,
        mentionedEntities: [],
        pendingTasks: [],
        turnCount: 0,
      },
    };

    if (memory) {
      const facts = memory.getLearnedFacts("");
      const corrections = memory.getCorrections("");
      const history = memory.getRelevantHistory("");

      input.memoryContext = {
        semantic: facts.map((f) => `- ${f.fact}`).join("\n"),
        procedural: corrections
          .map((c) => `- When asked "${c.original}", answer: ${c.corrected}`)
          .join("\n"),
        episodic: history
          .slice(0, 5)
          .map((h) => {
            if (h.type === "search" && h.query) {
              return `- Searched: "${h.query}"`;
            }
            if (h.type === "view" && h.documentTitle) {
              return `- Viewed: "${h.documentTitle}"`;
            }
            return null;
          })
          .filter(Boolean)
          .join("\n"),
      };
    }

    return buildContextMd(input, { maxTokenBudget: 2000 });
  }

  private buildRecentActivity(
    ctx: AgentExecutionContext
  ): ContextMdInput["recentActivity"] {
    if (!ctx.memory) {
      return [];
    }

    const history = ctx.memory.getRelevantHistory("", { limit: 5 });

    return history.map((h) => {
      const type: ContextMdInput["recentActivity"][number]["type"] = (() => {
        switch (h.type) {
          case "search":
            return "search";
          case "view":
            return "view";
          case "click":
            // Memory events can record "click" separately from "view", but the
            // context.md schema intentionally models this as a "view" activity.
            return "view";
          case "interaction":
            // Generic interaction events are best represented as a "question"
            // activity in context.md.
            return "question";
          default: {
            const _exhaustive: never = h.type;
            return _exhaustive;
          }
        }
      })();

      const description = (() => {
        // Preserve the old behavior: prefer query, then document title.
        if (h.query) {
          return h.query;
        }
        if (h.documentTitle) {
          return h.documentTitle;
        }
        return "interaction";
      })();

      return {
        type,
        description,
        timestamp: h.timestamp.getTime(),
        documentId: h.documentId,
        documentTitle: h.documentTitle,
      };
    });
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
      memory: ctx.memory,
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
