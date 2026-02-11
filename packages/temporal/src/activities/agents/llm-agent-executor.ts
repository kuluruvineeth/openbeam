import {
  type AgentExecutionContext,
  createEmptyState,
  createLlmAgent,
  type LlmAgentConfig,
} from "@openplane/ai";
import { Context } from "@temporalio/activity";
import type { AgentArtifact } from "../../workflows/types";
import type { AgentExecutor } from "./types";

const PRESET_TOOLS: Record<string, string[]> = {
  researcher: ["search_hybrid", "search_semantic", "doc_get", "rag_answer"],
  analyst: ["search_hybrid", "doc_get", "rag_analyze", "rag_answer"],
  writer: ["search_hybrid", "doc_get", "rag_answer"],
  general: ["*"],
};

const DEFAULT_MAX_STEPS_PER_EXECUTION = 10;

export class LlmAgentExecutor implements AgentExecutor {
  // biome-ignore lint/nursery/useMaxParams: implements AgentExecutor interface
  async executeStep(
    sessionId: string,
    agentType: string,
    step: number,
    previousArtifacts: AgentArtifact[],
    context: Record<string, unknown>
  ): Promise<{
    artifacts: AgentArtifact[];
    complete: boolean;
    tokensUsed?: number;
    costCents?: number;
  }> {
    const systemPrompt = (context.prompt as string) ?? "";
    const preset = (context.preset as string) ?? agentType;
    const tools = PRESET_TOOLS[preset] ?? PRESET_TOOLS.general;

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
    };

    const prompt = this.buildStepPrompt(step, previousArtifacts, context);

    const LLM_TIMEOUT_MS = 5 * 60 * 1000;
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

    const artifact: AgentArtifact = {
      id: `${sessionId}-step-${step}`,
      type: "text",
      content:
        typeof result.output === "string"
          ? result.output
          : JSON.stringify(result.output),
      createdAt: Date.now(),
    };

    const hasToolCalls = (result.trace.toolCalls?.length ?? 0) > 0;
    const complete = result.finishReason === "stop" && !hasToolCalls;

    return {
      artifacts: [artifact],
      complete,
      tokensUsed:
        result.totalTokens.inputTokens + result.totalTokens.outputTokens,
      costCents: 0,
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
}
