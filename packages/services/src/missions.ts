import {
  createMission,
  createMissionAgent,
  createMissionTask,
  type Database,
  findMissionTask,
  getMission,
  listMissionsWithStats,
  logMissionActivity,
  updateMission,
  updateMissionTask,
} from "@openplane/db";
import type { ApiAccessAuthContext } from "./api-access";
import {
  createResolveTeamId,
  createResolveWriteUserId,
} from "./lib/service-errors";

const MUTABLE_STATUSES = new Set(["DRAFT", "PAUSED"]);
const STARTABLE_STATUSES = new Set(["DRAFT", "ACTIVE"]);
const CANCELLABLE_STATUSES = new Set(["DRAFT", "ACTIVE", "PAUSED"]);

const ROLE_CAPABILITIES: Record<string, string[]> = {
  coordinator: ["coordination", "synthesis", "review"],
  researcher: ["research", "analysis"],
  analyst: ["analysis", "data"],
  writer: ["writing", "synthesis"],
  reviewer: ["review", "analysis"],
  specialist: ["research"],
};

export type MissionServiceErrorCode =
  | "MISSING_TEAM"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "NO_TEAM_USER"
  | "TASK_NOT_FOUND";

export class MissionServiceError extends Error {
  readonly code: MissionServiceErrorCode;

  constructor(code: MissionServiceErrorCode, message: string) {
    super(message);
    this.name = "MissionServiceError";
    this.code = code;
  }
}

const resolveTeamId = createResolveTeamId(MissionServiceError);
const resolveWriteUserId = createResolveWriteUserId(MissionServiceError);

function deriveCapabilities(role: string): string[] {
  return ROLE_CAPABILITIES[role] ?? ["research"];
}

function resolveActorId(authContext: ApiAccessAuthContext): string {
  if (authContext.type === "session") {
    return authContext.userId;
  }
  if (authContext.type === "apiKey") {
    return `api_key:${authContext.apiKeyId ?? "anonymous"}`;
  }
  return "anonymous";
}

function resolveActorName(authContext: ApiAccessAuthContext): string {
  if (authContext.type === "session") {
    return "Operator";
  }
  return "API Key";
}

async function resolveMission(
  db: Database,
  input: {
    missionId: string;
    teamId: string;
  }
) {
  const mission = await getMission(db, input.missionId, input.teamId);
  if (!mission) {
    throw new MissionServiceError("NOT_FOUND", "Mission not found");
  }
  return mission;
}

export async function listMissionsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    status?:
      | "DRAFT"
      | "ACTIVE"
      | "PAUSED"
      | "COMPLETED"
      | "CANCELLED"
      | "ARCHIVED";
    limit: number;
    offset: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);

  const missions = await listMissionsWithStats(db, teamId, {
    status: input.status,
    limit: input.limit + 1,
    offset: input.offset,
  });

  const hasMore = missions.length > input.limit;
  const items = hasMore ? missions.slice(0, -1) : missions;

  return {
    items: items.map((mission) => ({
      id: mission.id,
      name: mission.name,
      objective: mission.objective,
      status: mission.status,
      agentCount: mission._count.agents,
      taskCount: mission.tasks.length,
      completedTasks: mission.tasks.filter((task) => task.status === "DONE")
        .length,
      totalCostCents: mission.runs.reduce((sum, run) => sum + run.costCents, 0),
      budgetCents: mission.budgetCents,
      consumedCents: mission.consumedCents,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    })),
    hasMore,
    nextOffset: hasMore ? input.offset + items.length : undefined,
  };
}

export async function createMissionForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    objective: string;
    budgetCents?: number;
    maxConcurrentRuns: number;
    heartbeatIntervalMin?: number;
    cronSchedule?: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const userId = await resolveWriteUserId(db, {
    authContext: input.authContext,
    teamId,
    message: "No team user is available for mission ownership",
  });

  return createMission(db, {
    teamId,
    createdById: userId,
    name: input.objective.slice(0, 100),
    objective: input.objective,
    budgetCents: input.budgetCents,
    maxConcurrentRuns: input.maxConcurrentRuns,
    heartbeatIntervalMin: input.heartbeatIntervalMin,
    cronSchedule: input.cronSchedule,
    isRecurring: Boolean(input.cronSchedule),
  });
}

export async function getMissionForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  return await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });
}

export async function updateMissionForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
    name?: string;
    objective?: string;
    budgetCents?: number | null;
    maxConcurrentRuns?: number;
    heartbeatIntervalMin?: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const mission = await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });

  if (!MUTABLE_STATUSES.has(mission.status)) {
    throw new MissionServiceError(
      "INVALID_STATE",
      `Cannot modify mission in ${mission.status} status`
    );
  }

  return updateMission(db, mission.id, {
    name: input.name,
    objective: input.objective,
    budgetCents: input.budgetCents ?? undefined,
    maxConcurrentRuns: input.maxConcurrentRuns,
    heartbeatIntervalMin: input.heartbeatIntervalMin,
  });
}

export async function getMissionStartContextForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const mission = await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });

  if (!STARTABLE_STATUSES.has(mission.status)) {
    throw new MissionServiceError(
      "INVALID_STATE",
      `Cannot start mission in ${mission.status} status`
    );
  }

  return {
    missionId: mission.id,
    teamId,
    objective: mission.objective,
    maxConcurrentRuns: mission.maxConcurrentRuns,
    budgetCents: mission.budgetCents ?? undefined,
    heartbeatIntervalMin: mission.heartbeatIntervalMin,
    previousRunId: mission.runId,
  };
}

export async function markMissionStarted(
  db: Database,
  input: {
    missionId: string;
    workflowId: string;
    runId?: string;
    previousRunId?: string | null;
  }
) {
  await updateMission(db, input.missionId, {
    status: "ACTIVE",
    workflowId: input.workflowId,
    runId: input.runId || input.previousRunId || undefined,
  });
}

export async function getMissionPauseContextForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
    authContext: ApiAccessAuthContext;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const mission = await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });

  if (mission.status !== "ACTIVE") {
    throw new MissionServiceError(
      "INVALID_STATE",
      "Can only pause active missions"
    );
  }

  return {
    missionId: mission.id,
    actorId: resolveActorId(input.authContext),
  };
}

export async function markMissionPaused(db: Database, missionId: string) {
  await updateMission(db, missionId, { status: "PAUSED" });
}

export async function getMissionResumeContextForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
    authContext: ApiAccessAuthContext;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const mission = await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });

  if (mission.status !== "PAUSED") {
    throw new MissionServiceError(
      "INVALID_STATE",
      "Can only resume paused missions"
    );
  }

  return {
    missionId: mission.id,
    actorId: resolveActorId(input.authContext),
  };
}

export async function markMissionResumed(db: Database, missionId: string) {
  await updateMission(db, missionId, { status: "ACTIVE" });
}

export async function getMissionCancelContextForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
    authContext: ApiAccessAuthContext;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const mission = await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });

  if (!CANCELLABLE_STATUSES.has(mission.status)) {
    throw new MissionServiceError(
      "INVALID_STATE",
      `Cannot cancel mission in ${mission.status} status`
    );
  }

  return {
    missionId: mission.id,
    workflowId: mission.workflowId,
    actorId: resolveActorId(input.authContext),
  };
}

export async function markMissionCancelled(db: Database, missionId: string) {
  await updateMission(db, missionId, { status: "CANCELLED" });
}

export async function spawnMissionAgentForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
    authContext: ApiAccessAuthContext;
    name: string;
    role: string;
    tools: string[];
    taskId?: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const mission = await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });

  if (mission.status !== "ACTIVE") {
    throw new MissionServiceError(
      "INVALID_STATE",
      "Can only spawn agents on active missions"
    );
  }

  const userId = await resolveWriteUserId(db, {
    authContext: input.authContext,
    teamId,
    message: "No team user is available for mission operations",
  });

  const agent = await createMissionAgent(db, {
    missionId: mission.id,
    name: input.name,
    role: input.role,
    soulPrompt: `You are ${input.name}, a ${input.role}.`,
    level: "specialist",
    tools: input.tools,
    capabilities: deriveCapabilities(input.role),
    teamId,
    userId,
  });

  let taskId = input.taskId;

  if (taskId) {
    const task = await findMissionTask(db, taskId, mission.id);
    if (!task) {
      throw new MissionServiceError(
        "TASK_NOT_FOUND",
        "Task not found in this mission"
      );
    }

    await updateMissionTask(db, taskId, {
      assigneeId: agent.id,
      status: "ASSIGNED",
    });
  } else {
    const task = await createMissionTask(db, {
      missionId: mission.id,
      title: `Delegated to ${input.name}`,
      description: `Operator-spawned task for ${input.role}`,
      priority: "P2",
      assigneeId: agent.id,
      dependsOn: [],
      requiredCapabilities: deriveCapabilities(input.role),
      requestId: crypto.randomUUID(),
      createdById: userId,
    });
    taskId = task.id;
  }

  const payload = {
    childAgentId: agent.id,
    childAgentName: input.name,
    parentAgentId: userId,
    parentAgentName: resolveActorName(input.authContext),
    spawnDepth: 0,
    role: input.role,
    taskId,
  };

  await logMissionActivity(db, {
    missionId: mission.id,
    userId,
    agentId: agent.id,
    type: "agent_spawned",
    message: `Operator spawned agent "${input.name}"`,
    metadata: payload,
  });

  return {
    success: true as const,
    agentId: agent.id,
    taskId,
    wakeRequest: mission.workflowId
      ? {
          missionId: mission.id,
          reason: "manual" as const,
          metadata: {
            action: "spawn_agent",
            agentId: agent.id,
            taskId,
            requestedBy: userId,
          },
        }
      : null,
  };
}

export async function broadcastMissionForTeam(
  db: Database,
  input: {
    teamId: string | null;
    missionId: string;
    authContext: ApiAccessAuthContext;
    content: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const mission = await resolveMission(db, {
    missionId: input.missionId,
    teamId,
  });

  if (mission.status !== "ACTIVE") {
    throw new MissionServiceError(
      "INVALID_STATE",
      "Can only broadcast on active missions"
    );
  }

  const userId = await resolveWriteUserId(db, {
    authContext: input.authContext,
    teamId,
    message: "No team user is available for mission operations",
  });

  const messageId = crypto.randomUUID();
  const preview =
    input.content.length > 180
      ? `${input.content.slice(0, 180)}...`
      : input.content;

  await logMissionActivity(db, {
    missionId: mission.id,
    userId,
    type: "agent_message_sent",
    message: `Broadcast sent: ${preview}`,
    metadata: {
      messageId,
      fromAgentId: userId,
      fromAgentName: resolveActorName(input.authContext),
      toAgentId: null,
      toAgentName: "All agents",
      channel: "broadcast",
      preview,
      content: input.content,
    },
  });

  return {
    success: true as const,
    messageId,
    wakeRequest: mission.workflowId
      ? {
          missionId: mission.id,
          reason: "mention" as const,
          metadata: {
            action: "broadcast_message",
            messageId,
            requestedBy: userId,
          },
        }
      : null,
  };
}
