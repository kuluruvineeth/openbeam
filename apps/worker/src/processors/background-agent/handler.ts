import prisma, {
  addBackgroundAgentLog,
  createBackgroundAgentCheckpoint,
  findBackgroundAgentById,
  markBackgroundAgentFailed,
  updateBackgroundAgentProgress,
  updateBackgroundAgentResult,
  updateBackgroundAgentSandbox,
  updateBackgroundAgentStatus,
  updateBackgroundAgentUsage,
  updateBackgroundAgentWorktree,
} from "@openplane/db";
import { BackgroundAgentJobDataSchema, fence } from "@openplane/redis";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobStart } from "../event-handlers";

const tracer = trace.getTracer("openplane-worker");

export interface BackgroundAgentJobResult {
  agentId: string;
  status: "completed" | "failed" | "cancelled";
  output?: string;
  artifacts?: { type: string; path: string; content?: string }[];
  pullRequestUrl?: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
}

export async function processBackgroundAgentJob(
  job: Job<unknown>
): Promise<BackgroundAgentJobResult> {
  const parseResult = BackgroundAgentJobDataSchema.safeParse(job.data);
  if (!parseResult.success) {
    logger.error(
      { error: parseResult.error, jobId: job.id },
      "Invalid background agent job data"
    );
    throw new Error(`Invalid job data: ${parseResult.error.message}`);
  }

  const data = parseResult.data;
  const { agentId, teamId, userId, preset } = data;

  const span = tracer.startSpan("background-agent-processor.process", {
    attributes: {
      "job.id": job.id ?? "",
      "agent.id": agentId,
      "agent.preset": preset,
      "sandbox.type": data.sandboxType,
    },
  });

  const log = logger.child({
    jobId: job.id,
    agentId,
    teamId,
    userId,
    preset,
  });

  const startTime = Date.now();
  let fenceToken: number | null = null;

  try {
    logJobStart("background-agent", job.id, { agentId, preset });

    fenceToken = await fence.acquireFence(agentId);

    await updateBackgroundAgentStatus(prisma, agentId, "INITIALIZING", {
      startedAt: new Date(),
    });

    const result = await runBackgroundAgent(data, log, fenceToken);

    await fence.validateFence(agentId, fenceToken);

    span.setAttributes({
      "agent.status": result.status,
      "agent.input_tokens": result.inputTokens,
      "agent.output_tokens": result.outputTokens,
      "agent.duration_ms": result.durationMs,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = getErrorCode(error);

    log.error({ error, errorCode }, "Background agent job failed");

    await markBackgroundAgentFailed(prisma, agentId, errorCode, errorMessage);

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorMessage,
    });
    span.recordException(error as Error);

    return {
      agentId,
      status: "failed",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (fenceToken !== null) {
      await fence.releaseFence(agentId, fenceToken);
    }
    span.end();
  }
}

interface AgentJobData {
  agentId: string;
  teamId: string;
  userId: string;
  name: string;
  prompt: string;
  preset: string;
  sandboxType: string;
  repositoryUrl?: string;
  baseBranch?: string;
  maxSteps?: number;
  timeoutMs?: number;
  resumeFromCheckpoint?: number;
}

interface ExecutionState {
  stepIndex: number;
  output: string;
  artifacts: { type: string; path: string; content?: string }[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

async function executeStepLoop(
  data: AgentJobData,
  fenceToken: number,
  log: typeof logger
): Promise<ExecutionState> {
  const { agentId } = data;
  const maxSteps = data.maxSteps ?? 50;
  let stepIndex = data.resumeFromCheckpoint ?? 0;

  const state: ExecutionState = {
    stepIndex,
    output: "",
    artifacts: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
  };

  while (stepIndex < maxSteps) {
    await fence.validateFence(agentId, fenceToken);

    const stepResult = await executeAgentStep(data, stepIndex, log);

    state.totalInputTokens += stepResult.inputTokens;
    state.totalOutputTokens += stepResult.outputTokens;
    state.totalCost += stepResult.estimatedCostUsd;

    await updateBackgroundAgentUsage(prisma, agentId, {
      inputTokens: stepResult.inputTokens,
      outputTokens: stepResult.outputTokens,
      estimatedCostUsd: stepResult.estimatedCostUsd,
    });

    const progress = Math.min(99, Math.round((stepIndex / maxSteps) * 100));
    await updateBackgroundAgentProgress(
      prisma,
      agentId,
      progress,
      stepResult.currentStep
    );

    if (stepIndex % 5 === 0) {
      await createBackgroundAgentCheckpoint(prisma, agentId, {
        version: stepIndex,
        state: { stepIndex, output: stepResult.output },
        stepIndex,
        description: stepResult.currentStep,
      });
    }

    if (stepResult.isComplete) {
      state.output = stepResult.output;
      state.artifacts.push(...stepResult.artifacts);
      state.stepIndex = stepIndex;
      break;
    }

    stepIndex += 1;
  }

  state.stepIndex = stepIndex;
  return state;
}

async function runBackgroundAgent(
  data: AgentJobData,
  log: typeof logger,
  fenceToken: number
): Promise<BackgroundAgentJobResult> {
  const { agentId, teamId, preset, sandboxType } = data;
  const startTime = Date.now();

  log.info("Starting background agent execution");

  const agent = await findBackgroundAgentById(prisma, agentId, teamId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  await updateBackgroundAgentStatus(prisma, agentId, "RUNNING");
  await addBackgroundAgentLog(prisma, agentId, {
    level: "info",
    message: "Agent started",
    metadata: { preset, sandboxType },
  });

  let sandboxId: string | undefined;
  let worktreeBranch: string | undefined;

  try {
    if (sandboxType !== "local") {
      const sandboxInfo = await initializeSandbox(data, log);
      if (sandboxInfo) {
        sandboxId = sandboxInfo.id;
        await updateBackgroundAgentSandbox(
          prisma,
          agentId,
          sandboxInfo.id,
          sandboxInfo.url
        );
      }
    }

    if (data.repositoryUrl) {
      const worktreeInfo = await initializeWorktree(data, log);
      if (worktreeInfo) {
        worktreeBranch = worktreeInfo.branch;
        await updateBackgroundAgentWorktree(
          prisma,
          agentId,
          worktreeInfo.branch,
          worktreeInfo.path
        );
      }
    }

    const state = await executeStepLoop(data, fenceToken, log);

    let pullRequestUrl: string | undefined;
    if (worktreeBranch && state.output) {
      pullRequestUrl = await attemptCreatePullRequest(
        data,
        worktreeBranch,
        state.output,
        log
      );
    }

    await updateBackgroundAgentResult(prisma, agentId, {
      output: state.output,
      artifacts: state.artifacts,
      pullRequestUrl,
    });

    await addBackgroundAgentLog(prisma, agentId, {
      level: "info",
      message: "Agent completed",
      metadata: {
        steps: state.stepIndex,
        hasArtifacts: state.artifacts.length > 0,
        hasPullRequest: !!pullRequestUrl,
      },
    });

    log.info(
      { steps: state.stepIndex, inputTokens: state.totalInputTokens },
      "Background agent completed"
    );

    return {
      agentId,
      status: "completed",
      output: state.output,
      artifacts: state.artifacts,
      pullRequestUrl,
      inputTokens: state.totalInputTokens,
      outputTokens: state.totalOutputTokens,
      estimatedCostUsd: state.totalCost,
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (sandboxId) {
      log.debug({ sandboxId }, "Cleaning up sandbox");
    }
  }
}

interface SandboxHandle {
  id: string;
  url?: string;
}

interface WorktreeHandle {
  branch: string;
  path: string;
}

interface StepResult {
  output: string;
  currentStep: string;
  isComplete: boolean;
  artifacts: { type: string; path: string; content?: string }[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

async function initializeSandbox(
  data: AgentJobData,
  log: typeof logger
): Promise<SandboxHandle | null> {
  log.debug({ sandboxType: data.sandboxType }, "Initializing sandbox");

  try {
    const { getE2BSandboxProvider, getDockerSandboxProvider } = await import(
      "@openplane/ai"
    );

    const sandboxProvider =
      data.sandboxType === "e2b"
        ? getE2BSandboxProvider()
        : getDockerSandboxProvider();

    const isAvailable = await sandboxProvider.isAvailable();
    if (!isAvailable) {
      log.warn("Sandbox provider not available");
      return null;
    }

    const sandbox = await sandboxProvider.create({
      timeout: data.timeoutMs ?? 30 * 60 * 1000,
      template: data.preset === "coder" ? "code-interpreter" : undefined,
    });

    const info = await sandbox.getInfo();

    return {
      id: sandbox.id,
      url: info.url,
    };
  } catch (error) {
    log.warn({ error }, "Failed to initialize sandbox, continuing without");
    return null;
  }
}

async function initializeWorktree(
  data: AgentJobData,
  log: typeof logger
): Promise<WorktreeHandle | null> {
  if (!data.repositoryUrl) {
    return null;
  }

  log.debug({ repo: data.repositoryUrl }, "Initializing worktree");

  try {
    const { createWorktreeManager } = await import("@openplane/ai");

    const worktreeManager = createWorktreeManager({
      repositoryPath: data.repositoryUrl,
      baseBranch: data.baseBranch ?? "main",
      branchPrefix: "agent",
    });

    await worktreeManager.initialize();
    const worktree = await worktreeManager.create(data.agentId);

    return {
      branch: worktree.branch,
      path: worktree.path,
    };
  } catch (error) {
    log.warn({ error }, "Failed to initialize worktree, continuing without");
    return null;
  }
}

async function executeAgentStep(
  data: AgentJobData,
  stepIndex: number,
  log: typeof logger
): Promise<StepResult> {
  log.debug({ stepIndex }, "Executing agent step");

  try {
    const { createBackgroundAgentRunner, registry } = await import(
      "@openplane/ai"
    );

    const runner = createBackgroundAgentRunner({
      id: data.agentId,
      teamId: data.teamId,
      userId: data.userId,
      name: data.name,
      prompt: data.prompt,
      preset: data.preset,
      model: registry.chatModel("anthropic", "claude-sonnet-4-20250514"),
      maxSteps: 1,
    });

    const result = await runner.run();

    return {
      output: result.output ?? "",
      currentStep: `Step ${stepIndex + 1}`,
      isComplete: result.success,
      artifacts: result.artifacts,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
    };
  } catch (error) {
    log.error({ error, stepIndex }, "Step execution failed");
    return {
      output: "",
      currentStep: `Step ${stepIndex + 1} (failed)`,
      isComplete: false,
      artifacts: [],
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
  }
}

async function attemptCreatePullRequest(
  data: AgentJobData,
  branch: string,
  _output: string,
  log: typeof logger
): Promise<string | undefined> {
  log.debug({ branch }, "Attempting to create pull request");

  try {
    const { createWorktreeManager } = await import("@openplane/ai");

    if (!data.repositoryUrl) {
      return;
    }

    const worktreeManager = createWorktreeManager({
      repositoryPath: data.repositoryUrl,
      baseBranch: data.baseBranch ?? "main",
      branchPrefix: "agent",
    });

    const worktree = await worktreeManager.get(data.agentId);
    if (!worktree) {
      log.warn("Worktree not found for PR creation");
      return;
    }

    await worktree.push();

    log.info({ branch }, "Pushed changes to remote");
    return;
  } catch (error) {
    log.warn({ error }, "Failed to create pull request");
    return;
  }
}

function getErrorCode(error: unknown): string {
  if (!(error instanceof Error)) {
    return "UNKNOWN_ERROR";
  }

  const message = error.message.toLowerCase();

  if (message.includes("timeout")) {
    return "TIMEOUT";
  }
  if (message.includes("rate limit")) {
    return "RATE_LIMITED";
  }
  if (message.includes("auth")) {
    return "AUTH_ERROR";
  }
  if (message.includes("cancelled")) {
    return "CANCELLED";
  }

  return "UNKNOWN_ERROR";
}
