import {
  generateText,
  type ModelMessage,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";

type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
type JSONObject = { [key: string]: JSONValue };

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

  private buildGoogleProviderOptions(
    thinkingConfig: NonNullable<typeof this.config.model>["thinking"]
  ): Record<string, JSONObject> {
    const modelId = this.config.model?.modelId ?? "";
    const isGemini25 = modelId.includes("gemini-2.5");

    if (isGemini25) {
      const thinkingBudgetMap: Record<string, number> = {
        minimal: 1024,
        low: 4096,
        medium: 8192,
        high: 16_384,
      };
      const thinkingBudget =
        thinkingBudgetMap[thinkingConfig?.thinkingLevel ?? "low"] ?? 4096;

      return {
        google: {
          thinkingConfig: {
            includeThoughts: thinkingConfig?.includeThoughts ?? true,
            thinkingBudget,
          },
        },
      };
    }

    return {
      google: {
        thinkingConfig: {
          includeThoughts: thinkingConfig?.includeThoughts ?? true,
          thinkingLevel: thinkingConfig?.thinkingLevel ?? "low",
        },
      },
    };
  }

  private buildProviderOptions(
    providerId: string
  ): Record<string, JSONObject> | undefined {
    const thinkingConfig = this.config.model?.thinking;
    if (!thinkingConfig?.enabled) {
      return;
    }

    if (providerId === "google") {
      return this.buildGoogleProviderOptions(thinkingConfig);
    }

    if (providerId === "anthropic") {
      const budgetMap: Record<string, number> = {
        minimal: 2048,
        low: 4096,
        medium: 8192,
        high: 16_384,
      };
      const budgetTokens =
        budgetMap[thinkingConfig?.thinkingLevel ?? "low"] ?? 4096;

      return {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens,
          },
        },
      };
    }

    if (providerId === "openai") {
      const effortMap = {
        minimal: "low",
        low: "low",
        medium: "medium",
        high: "high",
      } as const;
      const effort = effortMap[thinkingConfig.thinkingLevel ?? "medium"];

      return {
        openai: {
          reasoningEffort: effort,
        },
      };
    }

    return;
  }

  private extractDeltaText(chunk: unknown): string {
    if (!chunk || typeof chunk !== "object") {
      return "";
    }
    const obj = chunk as Record<string, unknown>;
    if (typeof obj.textDelta === "string") {
      return obj.textDelta;
    }
    if (typeof obj.delta === "string") {
      return obj.delta;
    }
    if (typeof obj.text === "string") {
      return obj.text;
    }
    return "";
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
    const modelId = this.config.model?.modelId ?? aiConfig.defaultChatModel;
    const providerId = registry.resolveProvider(
      this.config.model?.providerId,
      modelId
    );
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
    const providerOptions = this.buildProviderOptions(providerId);

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
        providerOptions,
      });

      const output = result.text;
      const tokens = {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      };

      const allToolCalls: Array<{
        toolName: string;
        args: unknown;
        output?: unknown;
      }> = [];
      for (const step of result.steps) {
        const outputsByCallId = new Map<string, unknown>();
        for (const tr of step.toolResults) {
          outputsByCallId.set(tr.toolCallId, tr.output);
        }
        for (const tc of step.toolCalls) {
          allToolCalls.push({
            toolName: tc.toolName,
            args: tc.input,
            output: outputsByCallId.get(tc.toolCallId),
          });
        }
      }
      this.recordToolCalls(trace, allToolCalls);

      for (const tc of allToolCalls) {
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
    } catch (error) {
      console.warn(
        "Composition tracking failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

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
    const modelId = this.config.model?.modelId ?? aiConfig.defaultChatModel;
    const providerId = registry.resolveProvider(
      this.config.model?.providerId,
      modelId
    );
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
    const providerOptions = this.buildProviderOptions(providerId);

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
        providerOptions,
      });

      let fullText = "";
      let pendingReasoning = "";
      const toolCalls: Array<{
        toolCallId: string;
        toolName: string;
        args: unknown;
      }> = [];
      const toolOutputByCallId = new Map<string, unknown>();

      for await (const chunk of result.fullStream) {
        const chunkType = (chunk as { type?: string }).type ?? "unknown";

        if (
          chunkType === "reasoning-delta" ||
          chunkType === "reasoning" ||
          chunkType === "reasoning-start" ||
          chunkType === "thinking" ||
          chunkType === "thought"
        ) {
          const reasoning = this.extractDeltaText(chunk);
          if (reasoning) {
            pendingReasoning += reasoning;
            yield {
              type: "thinking",
              agentName: this.config.name,
              content: reasoning,
              modelDescription: reasoning,
            };
          }
        }

        if (chunkType === "text-delta") {
          const deltaText = this.extractDeltaText(chunk);
          if (deltaText) {
            fullText += deltaText;
            yield {
              type: "text",
              agentName: this.config.name,
              content: deltaText,
            };
          }
        }

        if (chunkType === "tool-call") {
          const toolChunk = chunk as {
            toolCallId: string;
            toolName: string;
            input?: unknown;
          };
          const toolCallInput = toolChunk.input;
          toolCalls.push({
            toolCallId: toolChunk.toolCallId,
            toolName: toolChunk.toolName,
            args: toolCallInput,
          });
          compositionTracker.recordToolCall(toolChunk.toolName);

          const modelDescription = pendingReasoning.trim() || undefined;
          pendingReasoning = "";

          yield {
            type: "tool-call",
            agentName: this.config.name,
            toolCallId: toolChunk.toolCallId,
            toolName: toolChunk.toolName,
            toolInput: toolCallInput,
            modelDescription,
          };
        }

        if (chunkType === "tool-result") {
          const toolResultChunk = chunk as {
            toolCallId: string;
            toolName: string;
            output?: unknown;
          };
          toolOutputByCallId.set(
            toolResultChunk.toolCallId,
            toolResultChunk.output
          );
          yield {
            type: "tool-result",
            agentName: this.config.name,
            toolCallId: toolResultChunk.toolCallId,
            toolName: toolResultChunk.toolName,
            toolOutput: toolResultChunk.output,
          };
        }
      }

      const [finalUsage] = await Promise.all([result.usage]);

      const tokens = {
        inputTokens: finalUsage?.inputTokens ?? 0,
        outputTokens: finalUsage?.outputTokens ?? 0,
      };

      const enrichedToolCalls = toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args,
        output: toolOutputByCallId.get(tc.toolCallId),
      }));
      this.recordToolCalls(trace, enrichedToolCalls);
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

    if (ctx.conversationHistory?.length) {
      for (const msg of ctx.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
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

    const RESPONSE_STYLES = [
      "concise",
      "detailed",
      "technical",
      "casual",
    ] as const;
    type ResponseStyle = (typeof RESPONSE_STYLES)[number];
    const isResponseStyle = (value: unknown): value is ResponseStyle =>
      typeof value === "string" &&
      (RESPONSE_STYLES as readonly string[]).includes(value);

    const input: ContextMdInput = {
      identity: {
        teamId: ctx.teamId,
        userId: ctx.userId,
        teamName:
          typeof ctx.metadata?.teamName === "string"
            ? ctx.metadata.teamName
            : "Your Team",
        agentRole: this.config.description,
      },
      preferences: {
        responseStyle: isResponseStyle(preferences.responseStyle)
          ? preferences.responseStyle
          : "concise",
        prefersBulletPoints: true,
        timezone:
          typeof preferences.timezone === "string"
            ? preferences.timezone
            : undefined,
        role:
          typeof preferences.role === "string" ? preferences.role : undefined,
        primaryProject:
          typeof preferences.primaryProject === "string"
            ? preferences.primaryProject
            : undefined,
        language:
          typeof preferences.language === "string"
            ? preferences.language
            : "en",
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
        activeConversationTopic:
          typeof ctx.metadata?.topic === "string"
            ? ctx.metadata.topic
            : undefined,
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
            return "view";
          case "interaction":
            return "question";
          default:
            return "question" as const;
        }
      })();

      const description = (() => {
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
    const canvasState = this.extractCanvasState(ctx.metadata) ?? {
      nodes: [],
      edges: [],
    };

    return {
      teamId: ctx.teamId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      accessControl: ctx.accessControl,
      abortSignal: ctx.abortSignal,
      metadata: ctx.metadata,
      services: toolRegistry.getServices(),
      memory: ctx.memory,
      canvasState,
    };
  }

  private extractCanvasState(
    metadata: Record<string, unknown> | undefined
  ): ToolContext["canvasState"] {
    if (!metadata?.canvas) {
      return;
    }

    const canvas = metadata.canvas as {
      nodes?: unknown[];
      edges?: unknown[];
    };

    if (!(Array.isArray(canvas.nodes) && Array.isArray(canvas.edges))) {
      return;
    }

    return canvas as ToolContext["canvasState"];
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
    toolCalls: Array<{ toolName: string; args: unknown; output?: unknown }>
  ): void {
    if (toolCalls.length === 0) {
      return;
    }

    const records: ToolCallRecord[] = toolCalls.map((tc) => ({
      name: tc.toolName,
      input: tc.args,
      output: tc.output,
      timestamp: Date.now(),
    }));

    trace.toolCalls = records;
  }
}

export function createLlmAgent(config: LlmAgentConfig): LlmAgent {
  return new LlmAgent(config);
}
