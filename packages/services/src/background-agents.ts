import {
  cancelBackgroundAgent,
  countBackgroundAgents,
  createBackgroundAgent,
  type Database,
  deleteBackgroundAgent,
  findBackgroundAgentById,
  getBackgroundAgentLogs,
  listBackgroundAgents,
  pauseBackgroundAgent,
  resumeBackgroundAgent,
} from "@openplane/db";
import type { BackgroundAgentStatus } from "@openplane/types/db";
import type { ApiAccessAuthContext } from "./api-access";
import {
  createResolveTeamId,
  createResolveWriteUserId,
} from "./lib/service-errors";

const CANCELLABLE_STATUSES = new Set<BackgroundAgentStatus>([
  "PENDING",
  "INITIALIZING",
  "RUNNING",
  "PAUSED",
  "AWAITING_INPUT",
]);

const SANDBOX_TYPE_MAP = {
  daytona: "DAYTONA",
  local: "LOCAL",
} as const;

export type BackgroundAgentsServiceErrorCode =
  | "MISSING_TEAM"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "NO_TEAM_USER";

export class BackgroundAgentsServiceError extends Error {
  readonly code: BackgroundAgentsServiceErrorCode;

  constructor(code: BackgroundAgentsServiceErrorCode, message: string) {
    super(message);
    this.name = "BackgroundAgentsServiceError";
    this.code = code;
  }
}

const resolveTeamId = createResolveTeamId(BackgroundAgentsServiceError);
const resolveWriteUserId = createResolveWriteUserId(
  BackgroundAgentsServiceError
);

async function resolveAgent(
  db: Database,
  input: { teamId: string; agentId: string; notFoundMessage: string }
) {
  const agent = await findBackgroundAgentById(db, input.agentId, input.teamId);
  if (!agent) {
    throw new BackgroundAgentsServiceError("NOT_FOUND", input.notFoundMessage);
  }
  return agent;
}

const MAX_WORKFLOW_NAME_LENGTH = 100;
const TRUNCATE_LENGTH = 97;

function deriveWorkflowName(prompt: string): string {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "Research workflow";
  }
  if (normalized.length <= MAX_WORKFLOW_NAME_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, TRUNCATE_LENGTH).trimEnd()}...`;
}

function toISOStringOrNull(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString();
}

export async function listBackgroundAgentsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    status?: BackgroundAgentStatus;
    limit: number;
    offset: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);

  const [items, total] = await Promise.all([
    listBackgroundAgents(db, teamId, undefined, {
      status: input.status,
      limit: input.limit + 1,
      offset: input.offset,
    }),
    countBackgroundAgents(db, teamId, undefined, input.status),
  ]);

  const hasMore = items.length > input.limit;
  const agents = hasMore ? items.slice(0, -1) : items;

  return {
    items: agents,
    total,
    hasMore,
    nextOffset: hasMore ? input.offset + agents.length : undefined,
  };
}

export async function createBackgroundAgentForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    name: string;
    description?: string;
    prompt: string;
    preset: string;
    sandboxType: keyof typeof SANDBOX_TYPE_MAP;
    repositoryUrl?: string;
    baseBranch?: string;
    timeoutMs?: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const userId = await resolveWriteUserId(db, {
    authContext: input.authContext,
    teamId,
    message: "No team user is available for background agent ownership",
  });

  return createBackgroundAgent(db, {
    teamId,
    userId,
    name: input.name,
    description: input.description,
    prompt: input.prompt,
    preset: input.preset,
    sandboxType: SANDBOX_TYPE_MAP[input.sandboxType],
    repositoryUrl: input.repositoryUrl,
    baseBranch: input.baseBranch,
    timeoutMs: input.timeoutMs,
  });
}

export async function getBackgroundAgentForTeam(
  db: Database,
  input: {
    teamId: string | null;
    agentId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  return await resolveAgent(db, {
    teamId,
    agentId: input.agentId,
    notFoundMessage: "Background agent not found",
  });
}

export async function deleteBackgroundAgentForTeam(
  db: Database,
  input: {
    teamId: string | null;
    agentId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  await resolveAgent(db, {
    teamId,
    agentId: input.agentId,
    notFoundMessage: "Background agent not found",
  });

  await deleteBackgroundAgent(db, input.agentId, teamId);
}

export async function pauseBackgroundAgentForTeam(
  db: Database,
  input: {
    teamId: string | null;
    agentId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const agent = await resolveAgent(db, {
    teamId,
    agentId: input.agentId,
    notFoundMessage: "Background agent not found",
  });

  if (agent.status !== "RUNNING") {
    throw new BackgroundAgentsServiceError(
      "INVALID_STATE",
      "Can only pause running agents"
    );
  }

  await pauseBackgroundAgent(db, input.agentId, teamId);
}

export async function resumeBackgroundAgentForTeam(
  db: Database,
  input: {
    teamId: string | null;
    agentId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const agent = await resolveAgent(db, {
    teamId,
    agentId: input.agentId,
    notFoundMessage: "Background agent not found",
  });

  if (agent.status !== "PAUSED") {
    throw new BackgroundAgentsServiceError(
      "INVALID_STATE",
      "Can only resume paused agents"
    );
  }

  await resumeBackgroundAgent(db, input.agentId, teamId);
}

export async function cancelBackgroundAgentForTeam(
  db: Database,
  input: {
    teamId: string | null;
    agentId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const agent = await resolveAgent(db, {
    teamId,
    agentId: input.agentId,
    notFoundMessage: "Background agent not found",
  });

  if (!CANCELLABLE_STATUSES.has(agent.status)) {
    throw new BackgroundAgentsServiceError(
      "INVALID_STATE",
      `Cannot cancel agent in ${agent.status} status`
    );
  }

  const result = await cancelBackgroundAgent(db, input.agentId, teamId);
  if (result.count === 0) {
    const latest = await findBackgroundAgentById(db, input.agentId, teamId);
    if (!latest) {
      throw new BackgroundAgentsServiceError(
        "NOT_FOUND",
        "Background agent not found"
      );
    }
    throw new BackgroundAgentsServiceError(
      "INVALID_STATE",
      `Cannot cancel agent in ${latest.status} status`
    );
  }
}

export async function getBackgroundAgentLogsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    agentId: string;
    level?: "debug" | "info" | "warn" | "error";
    limit: number;
    offset: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  await resolveAgent(db, {
    teamId,
    agentId: input.agentId,
    notFoundMessage: "Background agent not found",
  });

  const items = await getBackgroundAgentLogs(db, input.agentId, {
    level: input.level,
    limit: input.limit,
    offset: input.offset,
  });

  return {
    items,
    hasMore: items.length === input.limit,
    nextOffset: input.offset + items.length,
  };
}

export async function startResearchWorkflowForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    prompt: string;
    maxSteps?: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const userId = await resolveWriteUserId(db, {
    authContext: input.authContext,
    teamId,
    message: "No team user is available for research workflow ownership",
  });

  const workflow = await createBackgroundAgent(db, {
    teamId,
    userId,
    name: deriveWorkflowName(input.prompt),
    prompt: input.prompt,
    preset: "researcher",
    totalSteps: input.maxSteps,
  });

  return {
    workflowId: workflow.id,
    status: workflow.status,
  };
}

export async function getResearchProgressForTeam(
  db: Database,
  input: {
    teamId: string | null;
    workflowId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const workflow = await resolveAgent(db, {
    teamId,
    agentId: input.workflowId,
    notFoundMessage: "Research workflow not found",
  });

  return {
    workflowId: workflow.id,
    status: workflow.status,
    progress: workflow.progress,
    currentStep: workflow.currentStep,
    startedAt: toISOStringOrNull(workflow.startedAt),
    completedAt: toISOStringOrNull(workflow.completedAt),
    errorCode: workflow.errorCode,
    errorMessage: workflow.errorMessage,
  };
}

export async function getResearchArtifactsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    workflowId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const workflow = await resolveAgent(db, {
    teamId,
    agentId: input.workflowId,
    notFoundMessage: "Research workflow not found",
  });

  const artifacts: unknown[] = Array.isArray(workflow.artifacts)
    ? workflow.artifacts
    : [];

  return {
    workflowId: workflow.id,
    artifacts,
    output: workflow.output,
    pullRequestUrl: workflow.pullRequestUrl,
  };
}

export async function cancelResearchWorkflowForTeam(
  db: Database,
  input: {
    teamId: string | null;
    workflowId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const workflow = await resolveAgent(db, {
    teamId,
    agentId: input.workflowId,
    notFoundMessage: "Research workflow not found",
  });

  if (!CANCELLABLE_STATUSES.has(workflow.status)) {
    throw new BackgroundAgentsServiceError(
      "INVALID_STATE",
      `Cannot cancel workflow in ${workflow.status} status`
    );
  }

  const result = await cancelBackgroundAgent(db, input.workflowId, teamId);
  if (result.count === 0) {
    const latest = await findBackgroundAgentById(db, input.workflowId, teamId);
    if (!latest) {
      throw new BackgroundAgentsServiceError(
        "NOT_FOUND",
        "Research workflow not found"
      );
    }
    throw new BackgroundAgentsServiceError(
      "INVALID_STATE",
      `Cannot cancel workflow in ${latest.status} status`
    );
  }

  return {
    success: true,
    workflowId: input.workflowId,
    status: "CANCELLED" as const,
  };
}
