import {
  type AgentExecutionContext,
  calculateCost,
  createEmptyState,
  createLlmAgent,
  getConfig,
  type LlmAgentConfig,
} from "@openbeam/ai";
import { type ToolServices, toolRegistry } from "@openbeam/ai/tools";
import {
  getSandboxProvider,
  type FileInfo as RuntimeFileInfo,
  type Sandbox as RuntimeSandbox,
} from "@openbeam/sandbox";
import { Context } from "@temporalio/activity";
import { LLM_CALL_TIMEOUTS } from "../../config/timeouts";
import type { AgentArtifact } from "../../workflows/types";
import type { ChunkExecutionResult, ExecuteChunkInput } from "./chunked-types";
import { resolveSandboxProviderOrder } from "./sandbox-provider";
import type { AgentExecutor } from "./types";

const PRESET_TOOLS: Record<string, string[]> = {
  researcher: ["search_hybrid", "search_semantic", "doc_get", "rag_answer"],
  analyst: ["search_hybrid", "doc_get", "rag_analyze", "rag_answer"],
  writer: ["search_hybrid", "doc_get", "rag_answer"],
  general: ["*"],
  custom: [],
};

const DEFAULT_MAX_STEPS_PER_EXECUTION = 10;
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

const LLM_TIMEOUT_MS = parseTemporalDurationMs(
  LLM_CALL_TIMEOUTS.startToCloseTimeout
);

type SandboxToolService = NonNullable<ToolServices["sandbox"]>;
type SandboxToolRuntime = {
  code: RuntimeSandbox["code"];
  process: {
    run: RuntimeSandbox["commands"]["run"];
  };
  files: {
    read: RuntimeSandbox["files"]["read"];
    write: RuntimeSandbox["files"]["write"];
    list: RuntimeSandbox["files"]["list"];
  };
};

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
    const toolServices = this.resolveToolServices(context);

    const executionCtx: AgentExecutionContext = {
      teamId: (context.teamId as string) ?? "",
      userId: (context.userId as string) ?? "",
      sessionId,
      state,
      conversationHistory,
      metadata: {
        agentId: context.agentId,
        runId: context.runId,
        taskId: context.taskId,
        agentName: context.agentName,
        sandboxId: context.sandboxId,
        sandboxHost: context.sandboxHost,
        toolServices,
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

  private resolveToolServices(context: Record<string, unknown>): ToolServices {
    const baseServices = toolRegistry.getServices();
    const sandboxId = this.readContextString(context.sandboxId);
    if (!sandboxId) {
      return baseServices;
    }

    return {
      ...baseServices,
      sandbox: this.createSandboxToolService(sandboxId),
    };
  }

  private readContextString(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private createSandboxToolService(sandboxId: string): SandboxToolService {
    let cachedSandbox: SandboxToolRuntime | null = null;

    const connect = async (): Promise<SandboxToolRuntime> => {
      if (cachedSandbox) {
        return cachedSandbox;
      }

      cachedSandbox = await this.connectSandbox(sandboxId);
      return cachedSandbox;
    };

    return {
      executeCode: async (code, language = "python") => {
        const sandbox = await connect();
        return sandbox.code.run(code, language);
      },
      runCommand: async (command, opts) => {
        const sandbox = await connect();
        return sandbox.process.run(command, {
          cwd: opts?.cwd,
          env: opts?.env,
        });
      },
      readFile: async (path) => {
        const sandbox = await connect();
        return sandbox.files.read(path);
      },
      writeFile: async (path, content) => {
        const sandbox = await connect();
        await sandbox.files.write(path, content);
      },
      listFiles: async (path) => {
        const sandbox = await connect();
        const files = await sandbox.files.list(path);
        return files.map((file: RuntimeFileInfo) => ({
          path: file.path,
          name: file.name,
          isDirectory: file.isDirectory,
          size: file.size,
        }));
      },
    };
  }

  private toToolRuntime(sandbox: RuntimeSandbox): SandboxToolRuntime {
    return {
      code: sandbox.code,
      process: {
        run: sandbox.commands.run.bind(sandbox.commands),
      },
      files: {
        read: sandbox.files.read.bind(sandbox.files),
        write: sandbox.files.write.bind(sandbox.files),
        list: sandbox.files.list.bind(sandbox.files),
      },
    };
  }

  private async connectSandbox(sandboxId: string): Promise<SandboxToolRuntime> {
    const errors: string[] = [];

    for (const providerType of resolveSandboxProviderOrder()) {
      try {
        const provider = await getSandboxProvider({ provider: providerType });
        if (!(await provider.isAvailable())) {
          errors.push(`${providerType}: unavailable`);
          continue;
        }

        const sandbox = await provider.connect(sandboxId);
        return this.toToolRuntime(sandbox);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown sandbox error";
        errors.push(`${providerType}: ${message}`);
      }
    }

    const detail = errors.length > 0 ? errors.join("; ") : "no providers";
    throw new Error(`Unable to connect to sandbox ${sandboxId}: ${detail}`);
  }
}
