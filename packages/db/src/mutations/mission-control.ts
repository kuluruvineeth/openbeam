import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export function createMission(
  db: Database,
  input: {
    teamId: string;
    createdById: string;
    name: string;
    objective: string;
    timezone?: string;
    budgetCents?: number;
    maxConcurrentRuns?: number;
    heartbeatIntervalMin?: number;
  }
) {
  return db.mission.create({
    data: {
      teamId: input.teamId,
      createdById: input.createdById,
      name: input.name,
      objective: input.objective,
      timezone: input.timezone ?? "UTC",
      budgetCents: input.budgetCents,
      maxConcurrentRuns: input.maxConcurrentRuns ?? 3,
      heartbeatIntervalMin: input.heartbeatIntervalMin ?? 15,
    },
  });
}

export function updateMission(
  db: Database,
  missionId: string,
  data: {
    status?:
      | "DRAFT"
      | "ACTIVE"
      | "PAUSED"
      | "COMPLETED"
      | "CANCELLED"
      | "ARCHIVED";
    workflowId?: string;
    runId?: string;
    consumedCents?: number;
  }
) {
  return db.mission.update({
    where: { id: missionId },
    data,
  });
}

export function incrementMissionBudget(
  db: Database,
  missionId: string,
  costCents: number
) {
  return db.mission.update({
    where: { id: missionId },
    data: {
      consumedCents: { increment: costCents },
    },
  });
}

export function createMissionAgent(
  db: Database,
  input: {
    missionId: string;
    name: string;
    role: string;
    soulPrompt: string;
    level?: string;
    sortOrder?: number;
    teamId: string;
    userId: string;
  }
) {
  return db.$transaction(async (tx) => {
    const agent = await tx.backgroundAgent.create({
      data: {
        teamId: input.teamId,
        userId: input.userId,
        name: input.name,
        description: `Mission agent: ${input.role}`,
        prompt: input.soulPrompt,
        preset: "mission",
        status: "PENDING",
      },
    });

    const missionAgent = await tx.missionAgent.create({
      data: {
        missionId: input.missionId,
        agentId: agent.id,
        name: input.name,
        role: input.role,
        soulPrompt: input.soulPrompt,
        level: input.level ?? "specialist",
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return { ...missionAgent, agent };
  });
}

export function createMissionTask(
  db: Database,
  input: {
    missionId: string;
    title: string;
    description?: string;
    priority?: "P0" | "P1" | "P2" | "P3";
    requestId: string;
    createdById: string;
  }
) {
  return db.missionTask.upsert({
    where: { requestId: input.requestId },
    create: {
      missionId: input.missionId,
      title: input.title,
      description: input.description,
      priority: input.priority ?? "P2",
      requestId: input.requestId,
      createdById: input.createdById,
    },
    update: {},
  });
}

export function claimMissionTask(
  db: Database,
  taskId: string,
  agentId: string
) {
  return db.missionTask.updateMany({
    where: {
      id: taskId,
      status: { in: ["INBOX", "ASSIGNED"] },
    },
    data: {
      status: "IN_PROGRESS",
      assigneeId: agentId,
      claimedAt: new Date(),
    },
  });
}

export function completeMissionTask(
  db: Database,
  taskId: string,
  agentId: string
) {
  return db.missionTask.updateMany({
    where: {
      id: taskId,
      assigneeId: agentId,
      status: "IN_PROGRESS",
    },
    data: {
      status: "DONE",
      completedAt: new Date(),
    },
  });
}

export function createMissionComment(
  db: Database,
  input: {
    taskId: string;
    fromAgentId?: string;
    fromUserId?: string;
    content: string;
    mentions?: string[];
  }
) {
  return db.missionComment.create({
    data: {
      taskId: input.taskId,
      fromAgentId: input.fromAgentId,
      fromUserId: input.fromUserId,
      content: input.content,
      mentions: input.mentions ?? [],
    },
  });
}

export function createMissionRun(
  db: Database,
  input: {
    missionId: string;
    taskId?: string;
    agentId: string;
    workflowId?: string;
  }
) {
  return db.missionRun.create({
    data: {
      missionId: input.missionId,
      taskId: input.taskId,
      agentId: input.agentId,
      workflowId: input.workflowId,
    },
  });
}

export function updateMissionRun(
  db: Database,
  runId: string,
  data: {
    status?:
      | "QUEUED"
      | "RUNNING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED"
      | "TIMED_OUT";
    startedAt?: Date;
    completedAt?: Date;
    tokensUsed?: number;
    costCents?: number;
    artifacts?: Prisma.InputJsonValue;
    error?: string;
  }
) {
  return db.missionRun.update({
    where: { id: runId },
    data,
  });
}

export function logMissionActivity(
  db: Database,
  input: {
    missionId: string;
    type: string;
    message: string;
    agentId?: string;
    userId?: string;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return db.missionActivity.create({
    data: {
      missionId: input.missionId,
      type: input.type,
      message: input.message,
      agentId: input.agentId,
      userId: input.userId,
      metadata: input.metadata ?? {},
    },
  });
}

export function upsertMissionMemory(
  db: Database,
  input: {
    missionId: string;
    agentId?: string;
    key: string;
    value: unknown;
    scope?: string;
  }
) {
  const scope = input.scope ?? "mission";
  return db.missionMemory.upsert({
    where: {
      missionId_agentId_key_scope: {
        missionId: input.missionId,
        agentId: input.agentId ?? "",
        key: input.key,
        scope,
      },
    },
    create: {
      missionId: input.missionId,
      agentId: input.agentId,
      key: input.key,
      value: input.value as Prisma.InputJsonValue,
      scope,
    },
    update: {
      value: input.value as Prisma.InputJsonValue,
    },
  });
}
