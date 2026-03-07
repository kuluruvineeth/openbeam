import type {
  Artifact,
  BackgroundAgentStatus,
  CreateBackgroundAgentData,
  LogEntry,
  UsageIncrement,
} from "@openbeam/types/db";
import type { Database } from "../index";

export function createBackgroundAgent(
  db: Database,
  data: CreateBackgroundAgentData
) {
  const timeoutAt = data.timeoutMs
    ? new Date(Date.now() + data.timeoutMs)
    : new Date(Date.now() + 30 * 60 * 1000);

  return db.backgroundAgent.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      name: data.name,
      description: data.description,
      prompt: data.prompt,
      preset: data.preset ?? "researcher",
      totalSteps: data.totalSteps,
      sandboxType: data.sandboxType ?? "DAYTONA",
      repositoryUrl: data.repositoryUrl,
      baseBranch: data.baseBranch,
      maxRetries: data.maxRetries ?? 3,
      timeoutAt,
    },
  });
}

export function updateBackgroundAgentStatus(
  db: Database,
  id: string,
  status: BackgroundAgentStatus,
  updates?: {
    progress?: number;
    currentStep?: string;
    errorCode?: string;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
    lastActivityAt?: Date;
  }
) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      status,
      progress: updates?.progress,
      currentStep: updates?.currentStep,
      errorCode: updates?.errorCode,
      errorMessage: updates?.errorMessage,
      startedAt: updates?.startedAt,
      completedAt: updates?.completedAt,
      lastActivityAt: updates?.lastActivityAt ?? new Date(),
    },
  });
}

export function updateBackgroundAgentProgress(
  db: Database,
  id: string,
  progress: number,
  currentStep?: string
) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      progress,
      currentStep,
      lastActivityAt: new Date(),
    },
  });
}

export function updateBackgroundAgentSandbox(
  db: Database,
  id: string,
  sandboxId: string,
  sandboxUrl?: string
) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      sandboxId,
      sandboxUrl,
    },
  });
}

export function updateBackgroundAgentWorktree(
  db: Database,
  id: string,
  workingBranch: string,
  worktreePath: string
) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      workingBranch,
      worktreePath,
    },
  });
}

export function updateBackgroundAgentResult(
  db: Database,
  id: string,
  data: {
    output: string;
    artifacts?: Artifact[];
    pullRequestUrl?: string;
  }
) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      status: "COMPLETED",
      output: data.output,
      artifacts: (data.artifacts ?? []) as object[],
      pullRequestUrl: data.pullRequestUrl,
      completedAt: new Date(),
    },
  });
}

export function updateBackgroundAgentUsage(
  db: Database,
  id: string,
  usage: UsageIncrement
) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      inputTokens: { increment: usage.inputTokens },
      outputTokens: { increment: usage.outputTokens },
      estimatedCostUsd: { increment: usage.estimatedCostUsd },
    },
  });
}

export function markBackgroundAgentFailed(
  db: Database,
  id: string,
  errorCode: string,
  errorMessage: string
) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      status: "FAILED",
      errorCode,
      errorMessage,
      completedAt: new Date(),
    },
  });
}

export function incrementBackgroundAgentRetry(db: Database, id: string) {
  return db.backgroundAgent.update({
    where: { id },
    data: {
      retryCount: { increment: 1 },
    },
  });
}

export function cancelBackgroundAgent(
  db: Database,
  id: string,
  teamId: string
) {
  return db.backgroundAgent.updateMany({
    where: {
      id,
      teamId,
      status: {
        in: ["PENDING", "INITIALIZING", "RUNNING", "PAUSED", "AWAITING_INPUT"],
      },
    },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
    },
  });
}

export function pauseBackgroundAgent(db: Database, id: string, teamId: string) {
  return db.backgroundAgent.updateMany({
    where: {
      id,
      teamId,
      status: "RUNNING",
    },
    data: {
      status: "PAUSED",
      lastActivityAt: new Date(),
    },
  });
}

export function resumeBackgroundAgent(
  db: Database,
  id: string,
  teamId: string
) {
  return db.backgroundAgent.updateMany({
    where: {
      id,
      teamId,
      status: "PAUSED",
    },
    data: {
      status: "RUNNING",
      lastActivityAt: new Date(),
    },
  });
}

export function markTimedOutAgents(db: Database) {
  return db.backgroundAgent.updateMany({
    where: {
      status: "RUNNING",
      timeoutAt: { lte: new Date() },
    },
    data: {
      status: "TIMED_OUT",
      completedAt: new Date(),
    },
  });
}

export function createBackgroundAgentCheckpoint(
  db: Database,
  agentId: string,
  data: {
    version: number;
    state: unknown;
    memorySnapshot?: unknown;
    contextWindow?: unknown;
    stepIndex: number;
    description?: string;
  }
) {
  return db.backgroundAgentCheckpoint.create({
    data: {
      agentId,
      version: data.version,
      state: data.state as object,
      memorySnapshot: data.memorySnapshot as object | undefined,
      contextWindow: data.contextWindow as object | undefined,
      stepIndex: data.stepIndex,
      description: data.description,
    },
  });
}

export function addBackgroundAgentLog(
  db: Database,
  agentId: string,
  entry: LogEntry
) {
  return db.backgroundAgentLog.create({
    data: {
      agentId,
      level: entry.level,
      message: entry.message,
      metadata: entry.metadata as object | undefined,
    },
  });
}

export function deleteBackgroundAgent(
  db: Database,
  id: string,
  teamId: string
) {
  return db.backgroundAgent.deleteMany({
    where: { id, teamId },
  });
}

export function cleanupOldBackgroundAgents(
  db: Database,
  olderThan: Date,
  statuses: BackgroundAgentStatus[] = [
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "TIMED_OUT",
  ]
) {
  return db.backgroundAgent.deleteMany({
    where: {
      status: { in: statuses },
      completedAt: { lte: olderThan },
    },
  });
}
