import {
  type AgentExecutionContext,
  calculateCost,
  createEmptyState,
  createLlmAgent,
  getConfig,
  type LlmAgentConfig,
} from "@openplane/ai";
import { Context } from "@temporalio/activity";
import { LLM_CALL_TIMEOUTS } from "../../config/timeouts";
import type { AgentArtifact } from "../../workflows/types";
import type { ChunkExecutionResult, ExecuteChunkInput } from "./chunked-types";
import type { AgentExecutor } from "./types";

const PRESET_TOOLS: Record<string, string[]> = {
  researcher: ["search_hybrid", "search_semantic", "doc_get", "rag_answer"],
  analyst: ["search_hybrid", "doc_get", "rag_analyze", "rag_answer"],
  writer: ["search_hybrid", "doc_get", "rag_answer"],
  general: ["*"],
  custom: [],
};

const DEFAULT_MAX_STEPS_PER_EXECUTION = 10;
const LLM_TIMEOUT_MS = parseTemporalDurationMs(
  LLM_CALL_TIMEOUTS.startToCloseTimeout
);

const TEMPORAL_DURATION_REGEX = /^(\d+)\s*(ms|s|m|h)$/;

function parseTemporalDurationMs(duration: string): number {
  const match = duration.match(TEMPORAL_DURATION_REGEX);
  if (!match) {
    return 5 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "ms") {
    return value;
  }
  if (unit === "s") {
    return value * 1000;
  }
  if (unit === "m") {
    return value * 60 * 1000;
  }
  return value * 60 * 60 * 1000;
}

export class LlmAgentExecutor implements AgentExecutor {
  async executeStep(
    ...args: [
      sessionId: string,
      agentType: string,
      step: number,
      previousArtifacts: AgentArtifact[],
      context: Record<string, unknown>,
    ]
  ): Promise<{
    artifacts: AgentArtifact[];
    complete: boolean;
    tokensUsed?: number;
    costCents?: number;
  }> {
    const [sessionId, agentType, step, previousArtifacts, context] = args;
    const systemPrompt = (context.prompt as string) ?? "";
    const explicitTools = context.tools as string[] | undefined;
    const preset = explicitTools?.length
      ? "custom"
      : ((context.preset as string) ?? agentType);
    const tools = explicitTools?.length
      ? explicitTools
      : (PRESET_TOOLS[preset] ?? PRESET_TOOLS.general);

    const config: LlmAgentConfig = {
      type: "llm",
      name: (context.agentName as string) ?? `agent-${preset}`,
      systemPrompt,
      tools,
      maxSteps: DEFAULT_MAX_STEPS_PER_EXECUTION,
    };

    const agent = createLlmAgent(config);
    const state = createEmptyState();

    const conversationHistory = this.buildConversationHistory(
      previousArtifacts,
      context.contextWindow as unknown[] | undefined
    );

    const executionCtx: AgentExecutionContext = {
      teamId: (context.teamId as string) ?? "",
      userId: (context.userId as string) ?? "",
      sessionId,
      state,
      conversationHistory,
      metadata: {
        missionId: context.missionId,
        agentId: context.agentId,
        runId: context.runId,
        taskId: context.taskId,
        agentName: context.agentName,
      },
    };

    const prompt = this.buildStepPrompt(step, previousArtifacts, context);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    let result: Awaited<ReturnType<typeof agent.execute>>;
    try {
      result = await agent.execute(prompt, {
        ...executionCtx,
        abortSignal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    Context.current().heartbeat({ step, status: "completed_llm_call" });

    const textOutput = typeof result.output === "string" ? result.output : "";
    const toolCalls = result.trace.toolCalls ?? [];
    const content = this.buildArtifactContent(textOutput, toolCalls);

    const artifact: AgentArtifact = {
      id: `${sessionId}-step-${step}`,
      type: "text",
      content,
      summary:
        textOutput ||
        (toolCalls.length > 0
          ? `Executed ${toolCalls.length} tool${toolCalls.length !== 1 ? "s" : ""}`
          : undefined),
      createdAt: Date.now(),
    };

    const hasToolCalls = toolCalls.length > 0;
    const complete = result.finishReason === "stop" && !hasToolCalls;

    const aiConfig = getConfig();
    const modelId = config.model?.modelId ?? aiConfig.defaultChatModel;
    const cost = calculateCost(
      modelId,
      result.totalTokens.inputTokens,
      result.totalTokens.outputTokens
    );
    const costCents = Math.ceil(cost.totalCostUsd * 100);

    return {
      artifacts: [artifact],
      complete,
      tokensUsed:
        result.totalTokens.inputTokens + result.totalTokens.outputTokens,
      costCents,
    };
  }

  async executeChunk(input: ExecuteChunkInput): Promise<ChunkExecutionResult> {
    const { sessionId, agentType, step, chunkIndex, previousOutput, context } =
      input;
    const accumulatedArtifacts = this.readAccumulatedArtifacts(context);
    const result = await this.executeStep(
      sessionId,
      agentType,
      step,
      accumulatedArtifacts,
      {
        ...context,
        chunkIndex,
        previousChunkState: previousOutput?.intermediateState ?? null,
      }
    );

    return {
      artifacts: result.artifacts,
      intermediateState: {
        chunkIndex,
        complete: result.complete,
      },
      tokensUsed: result.tokensUsed ?? 0,
      costCents: result.costCents ?? 0,
      complete: result.complete,
      needsMoreChunks: !result.complete,
    };
  }

  private buildConversationHistory(
    previousArtifacts: AgentArtifact[],
    contextWindow: unknown[] | undefined
  ): Array<{ role: "user" | "assistant"; content: string }> {
    if (contextWindow?.length) {
      return contextWindow as Array<{
        role: "user" | "assistant";
        content: string;
      }>;
    }

    return previousArtifacts
      .filter((a) => typeof a.content === "string" && a.content)
      .map((a) => ({
        role: "assistant" as const,
        content: a.content as string,
      }));
  }

  private buildArtifactContent(
    textOutput: string,
    toolCalls: Array<{ name: string; input?: unknown; output?: unknown }>
  ): string {
    if (textOutput && toolCalls.length === 0) {
      return textOutput;
    }

    const parts: string[] = [];

    for (const tc of toolCalls) {
      const raw = tc.output;
      const preview = raw
        ? (typeof raw === "string" ? raw : JSON.stringify(raw)).slice(0, 1000)
        : "";
      parts.push(preview ? `[${tc.name}]\n${preview}` : `[${tc.name}]`);
    }

    if (textOutput) {
      parts.push(textOutput);
    }

    return parts.join("\n\n") || "No output";
  }

  private buildStepPrompt(
    step: number,
    previousArtifacts: AgentArtifact[],
    context: Record<string, unknown>
  ): string {
    if (step === 1) {
      return (context.prompt as string) ?? "Begin your task.";
    }

    const lastArtifact = previousArtifacts.at(-1);
    if (lastArtifact?.content) {
      return `Continue from your previous output. Step ${step}.`;
    }

    return `Continue your task. Step ${step}.`;
  }

  private readAccumulatedArtifacts(
    context: Record<string, unknown>
  ): AgentArtifact[] {
    const value = context.accumulatedArtifacts;
    if (!Array.isArray(value)) {
      return [];
    }

    return value as AgentArtifact[];
  }
}
