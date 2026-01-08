import {
  tool as aiTool,
  generateText,
  type LanguageModel,
  type ToolSet,
} from "ai";
import { z } from "zod";
import type {
  CheckpointData,
  CheckpointService,
  ConversationMessage,
} from "./checkpoint";
import { getDockerSandboxProvider } from "./docker-sandbox";
import { getE2BSandboxProvider } from "./e2b-sandbox";
import type { Sandbox, SandboxConfig, SandboxProvider } from "./sandbox";
import type { Worktree, WorktreeManager } from "./worktree";

export type BackgroundAgentStatus =
  | "PENDING"
  | "INITIALIZING"
  | "RUNNING"
  | "PAUSED"
  | "AWAITING_INPUT"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export interface BackgroundAgentConfig {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  prompt: string;
  preset?: string;
  model: LanguageModel;
  sandboxType?: "e2b" | "docker" | "local";
  sandboxConfig?: SandboxConfig;
  worktreeManager?: WorktreeManager;
  checkpointService?: CheckpointService;
  maxSteps?: number;
  timeoutMs?: number;
  onStatusChange?: (status: BackgroundAgentStatus) => void;
  onProgress?: (progress: number, step: string) => void;
  onLog?: (
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ) => void;
}

export interface BackgroundAgentResult {
  success: boolean;
  output?: string;
  artifacts: Array<{
    type: string;
    path: string;
    content?: string;
  }>;
  pullRequestUrl?: string;
  error?: {
    code: string;
    message: string;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
}

interface RunnerState {
  stepIndex: number;
  conversationHistory: ConversationMessage[];
  toolResults: Record<string, unknown>;
  currentObjective: string;
  completedObjectives: string[];
  workingMemory: Record<string, unknown>;
  artifacts: Array<{
    type: string;
    path: string;
    content?: string;
  }>;
}

const SYSTEM_PROMPT_TEMPLATE = `You are an autonomous AI agent running in the background. Your task is to complete the user's objective independently.

## Your Capabilities
- Execute code in a sandboxed environment
- Read and write files
- Run shell commands
- Create and modify code
- Make commits and create pull requests (if git is configured)

## Guidelines
1. Break down complex tasks into smaller steps
2. Verify your work after each step
3. If you encounter errors, debug and fix them
4. Create checkpoints at important milestones
5. When done, call the markComplete tool with a summary

## Current Objective
{objective}

## Working Directory
{workingDirectory}

## Additional Context
{context}
`;

export class BackgroundAgentRunner {
  private readonly config: BackgroundAgentConfig;
  private sandbox: Sandbox | null = null;
  private worktree: Worktree | null = null;
  private state: RunnerState;
  private status: BackgroundAgentStatus = "PENDING";
  private abortController: AbortController | null = null;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(config: BackgroundAgentConfig) {
    this.config = config;
    this.state = {
      stepIndex: 0,
      conversationHistory: [],
      toolResults: {},
      currentObjective: config.prompt,
      completedObjectives: [],
      workingMemory: {},
      artifacts: [],
    };
  }

  async run(): Promise<BackgroundAgentResult> {
    this.abortController = new AbortController();

    try {
      await this.initialize();
      return await this.executeLoop();
    } catch (error) {
      return this.handleError(error);
    } finally {
      await this.cleanup();
    }
  }

  async pause(): Promise<void> {
    this.updateStatus("PAUSED");

    if (this.config.checkpointService) {
      await this.config.checkpointService.createCheckpoint(
        this.config.id,
        {
          ...this.state,
          conversationHistory: this.state.conversationHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
        {
          description: `Paused at step ${this.state.stepIndex}`,
        }
      );
    }
  }

  async resume(): Promise<BackgroundAgentResult> {
    if (this.config.checkpointService) {
      const checkpoint =
        await this.config.checkpointService.restoreFromCheckpoint(
          this.config.id
        );

      if (checkpoint) {
        this.restoreState(checkpoint);
      }
    }

    this.updateStatus("RUNNING");
    return this.executeLoop();
  }

  async cancel(): Promise<void> {
    this.updateStatus("CANCELLED");
    this.abortController?.abort();
    await this.cleanup();
  }

  getStatus(): BackgroundAgentStatus {
    return this.status;
  }

  getProgress(): { step: number; total: number; description: string } {
    return {
      step: this.state.stepIndex,
      total: this.config.maxSteps ?? 50,
      description: this.state.currentObjective,
    };
  }

  private async initialize(): Promise<void> {
    this.updateStatus("INITIALIZING");
    this.log("info", "Initializing background agent");

    const sandboxProvider = await this.getSandboxProvider();
    if (sandboxProvider) {
      this.sandbox = await sandboxProvider.create(this.config.sandboxConfig);
      this.log("info", `Sandbox created: ${this.sandbox.id}`);
    }

    if (this.config.worktreeManager) {
      this.worktree = await this.config.worktreeManager.create(this.config.id);
      this.log("info", `Worktree created: ${this.worktree.path}`);
    }

    this.updateStatus("RUNNING");
  }

  private async getSandboxProvider(): Promise<SandboxProvider | null> {
    const sandboxType = this.config.sandboxType ?? "e2b";

    if (sandboxType === "e2b") {
      try {
        const provider = getE2BSandboxProvider();
        if (await provider.isAvailable()) {
          return provider;
        }
      } catch {
        this.log("warn", "E2B not available, falling back to Docker");
      }
    }

    if (sandboxType === "docker" || sandboxType === "e2b") {
      try {
        const provider = getDockerSandboxProvider();
        if (await provider.isAvailable()) {
          return provider;
        }
      } catch {
        this.log("warn", "Docker not available");
      }
    }

    return null;
  }

  private checkAbortOrPause(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error("Agent cancelled");
    }
    if (this.status === "PAUSED") {
      throw new Error("Agent paused");
    }
  }

  private logToolCalls(
    toolCalls: Array<{ toolName: string }> | undefined
  ): void {
    if (!toolCalls?.length) {
      return;
    }
    for (const toolCall of toolCalls) {
      this.log("info", `Tool call: ${toolCall.toolName}`);
    }
  }

  private async executeStep(): Promise<
    Awaited<ReturnType<typeof generateText>>
  > {
    const systemPrompt = this.buildSystemPrompt();
    const tools = this.buildTools();

    return await generateText({
      model: this.config.model,
      system: systemPrompt,
      messages: this.state.conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools,
      abortSignal: this.abortController?.signal,
    });
  }

  private async executeLoop(): Promise<BackgroundAgentResult> {
    const maxSteps = this.config.maxSteps ?? 50;

    while (this.state.stepIndex < maxSteps) {
      this.checkAbortOrPause();

      this.state.stepIndex += 1;
      this.updateProgress(
        this.state.stepIndex / maxSteps,
        `Step ${this.state.stepIndex}`
      );

      const result = await this.executeStep();

      this.totalInputTokens += result.usage?.totalTokens ?? 0;
      this.totalOutputTokens += result.usage?.totalTokens ?? 0;

      this.state.conversationHistory.push({
        role: "assistant",
        content: result.text,
      });

      this.logToolCalls(result.toolCalls);

      if (this.shouldCheckpoint()) {
        await this.createCheckpoint();
      }

      if (this.isCompleted(result.text)) {
        this.updateStatus("COMPLETED");
        return this.buildResult(true, result.text);
      }
    }

    this.updateStatus("TIMED_OUT");
    return this.buildResult(false, "Max steps reached");
  }

  private buildSystemPrompt(): string {
    return SYSTEM_PROMPT_TEMPLATE.replace("{objective}", this.config.prompt)
      .replace("{workingDirectory}", this.worktree?.path ?? "/workspace")
      .replace("{context}", JSON.stringify(this.state.workingMemory));
  }

  private buildTools() {
    const tools: ToolSet = {};

    if (this.sandbox) {
      const sandbox = this.sandbox;

      const executeCodeSchema = z.object({
        code: z.string().describe("The code to execute"),
        language: z
          .enum(["python", "javascript", "bash"])
          .optional()
          .describe("Programming language"),
      });

      tools.executeCode = aiTool({
        description: "Execute code in the sandbox",
        inputSchema: executeCodeSchema,
        execute: async (params: z.infer<typeof executeCodeSchema>) =>
          sandbox.code.run(params.code, params.language ?? "python"),
      });

      const runCommandSchema = z.object({
        command: z.string().describe("The command to run"),
        cwd: z.string().optional().describe("Working directory"),
      });

      tools.runCommand = aiTool({
        description: "Run a shell command in the sandbox",
        inputSchema: runCommandSchema,
        execute: async (params: z.infer<typeof runCommandSchema>) =>
          sandbox.process.run(params.command, { cwd: params.cwd }),
      });

      const readFileSchema = z.object({
        path: z.string().describe("File path to read"),
      });

      tools.readFile = aiTool({
        description: "Read a file from the sandbox",
        inputSchema: readFileSchema,
        execute: async (params: z.infer<typeof readFileSchema>) =>
          sandbox.files.read(params.path),
      });

      const writeFileSchema = z.object({
        path: z.string().describe("File path to write"),
        content: z.string().describe("Content to write"),
      });

      tools.writeFile = aiTool({
        description: "Write content to a file in the sandbox",
        inputSchema: writeFileSchema,
        execute: async (params: z.infer<typeof writeFileSchema>) => {
          await sandbox.files.write(params.path, params.content);
          return { success: true };
        },
      });
    }

    if (this.worktree) {
      const worktree = this.worktree;

      const gitCommitSchema = z.object({
        message: z.string().describe("Commit message"),
        files: z
          .array(z.string())
          .optional()
          .describe("Files to commit (defaults to all)"),
      });

      tools.gitCommit = aiTool({
        description: "Commit changes to the git repository",
        inputSchema: gitCommitSchema,
        execute: async (params: z.infer<typeof gitCommitSchema>) => {
          const sha = await worktree.commit(params.message, params.files);
          return { sha };
        },
      });

      const emptySchema = z.object({});

      tools.gitPush = aiTool({
        description: "Push changes to remote",
        inputSchema: emptySchema,
        execute: async () => {
          await worktree.push();
          return { success: true };
        },
      });

      tools.gitDiff = aiTool({
        description: "Get the diff of current changes",
        inputSchema: emptySchema,
        execute: async () => worktree.diff(),
      });
    }

    const state = this.state;

    const markCompleteSchema = z.object({
      summary: z.string().describe("Summary of what was accomplished"),
      artifacts: z
        .array(
          z.object({
            type: z.string(),
            path: z.string(),
          })
        )
        .optional()
        .describe("List of artifacts created"),
    });

    tools.markComplete = aiTool({
      description: "Mark the task as complete with a summary",
      inputSchema: markCompleteSchema,
      execute: (params: z.infer<typeof markCompleteSchema>) => {
        state.workingMemory.completionSummary = params.summary;
        if (params.artifacts) {
          state.artifacts.push(...params.artifacts);
        }
        return { complete: true };
      },
    });

    return tools;
  }

  private isCompleted(text: string): boolean {
    return (
      this.state.workingMemory.completionSummary !== undefined ||
      text.toLowerCase().includes("task completed") ||
      text.toLowerCase().includes("objective achieved")
    );
  }

  private shouldCheckpoint(): boolean {
    if (!this.config.checkpointService) {
      return false;
    }
    return this.config.checkpointService.shouldCheckpoint(this.state.stepIndex);
  }

  private async createCheckpoint(): Promise<void> {
    if (!this.config.checkpointService) {
      return;
    }

    await this.config.checkpointService.createCheckpoint(this.config.id, {
      ...this.state,
      conversationHistory: this.state.conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    this.log("info", `Checkpoint created at step ${this.state.stepIndex}`);
  }

  private restoreState(checkpoint: CheckpointData): void {
    this.state = {
      ...checkpoint.state,
      conversationHistory: checkpoint.state.conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      toolResults: checkpoint.state.toolResults,
    };
  }

  private buildResult(
    success: boolean,
    output?: string
  ): BackgroundAgentResult {
    const costPerInputToken = 0.000_003;
    const costPerOutputToken = 0.000_015;

    return {
      success,
      output: output ?? (this.state.workingMemory.completionSummary as string),
      artifacts: this.state.artifacts,
      pullRequestUrl: this.state.workingMemory.pullRequestUrl as
        | string
        | undefined,
      error: success
        ? undefined
        : { code: "EXECUTION_ERROR", message: output ?? "Unknown error" },
      usage: {
        inputTokens: this.totalInputTokens,
        outputTokens: this.totalOutputTokens,
        estimatedCostUsd:
          this.totalInputTokens * costPerInputToken +
          this.totalOutputTokens * costPerOutputToken,
      },
    };
  }

  private handleError(error: unknown): BackgroundAgentResult {
    const message = error instanceof Error ? error.message : String(error);

    if (message === "Agent cancelled") {
      return this.buildResult(false, "Agent was cancelled");
    }

    if (message === "Agent paused") {
      return this.buildResult(false, "Agent was paused");
    }

    this.updateStatus("FAILED");
    this.log("error", `Agent failed: ${message}`);

    return {
      success: false,
      output: undefined,
      artifacts: this.state.artifacts,
      error: {
        code: "EXECUTION_ERROR",
        message,
      },
      usage: {
        inputTokens: this.totalInputTokens,
        outputTokens: this.totalOutputTokens,
        estimatedCostUsd: 0,
      },
    };
  }

  private async cleanup(): Promise<void> {
    if (this.sandbox) {
      try {
        await this.sandbox.kill();
      } catch {
        // Ignore cleanup errors
      }
    }

    if (this.worktree && this.status === "FAILED") {
      try {
        await this.worktree.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private updateStatus(status: BackgroundAgentStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
    this.log("info", `Status changed to ${status}`);
  }

  private updateProgress(progress: number, step: string): void {
    this.config.onProgress?.(progress, step);
  }

  private log(
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.config.onLog?.(level, message, metadata);
  }
}

export function createBackgroundAgentRunner(
  config: BackgroundAgentConfig
): BackgroundAgentRunner {
  return new BackgroundAgentRunner(config);
}
