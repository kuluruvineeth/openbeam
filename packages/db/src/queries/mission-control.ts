import type {
  MissionTaskPriority,
  MissionTaskStatus,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export function listMissionsWithStats(
  db: Database,
  teamId: string,
  opts: {
    status?: string;
    limit: number;
    offset: number;
  }
) {
  return db.mission.findMany({
    where: {
      teamId,
      ...(opts.status ? { status: opts.status as never } : {}),
    },
    include: {
      _count: { select: { agents: true } },
      tasks: { select: { status: true } },
      runs: { select: { costCents: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: opts.limit,
    skip: opts.offset,
  });
}

export function listMissionApprovals(
  db: Database,
  missionId: string,
  opts?: { status?: string }
) {
  return db.missionActivity.findMany({
    where: {
      missionId,
      type: { startsWith: "approval" },
      ...(opts?.status
        ? { metadata: { path: ["status"], equals: opts.status } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function listMissionRuns(
  db: Database,
  missionId: string,
  opts: {
    status?: string;
    limit: number;
    offset: number;
  }
) {
  return db.missionRun.findMany({
    where: {
      missionId,
      ...(opts.status ? { status: opts.status as never } : {}),
    },
    include: {
      agent: { select: { id: true, name: true, role: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit,
    skip: opts.offset,
  });
}

export function listMissionRunArtifacts(db: Database, missionId: string) {
  return db.missionRun.findMany({
    where: {
      missionId,
      status: "COMPLETED",
    },
    select: {
      id: true,
      artifacts: true,
      agent: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findMissionAgent(
  db: Database,
  agentId: string,
  missionId: string
) {
  return db.missionAgent.findFirst({
    where: { id: agentId, missionId },
  });
}

export function findMissionTask(
  db: Database,
  taskId: string,
  missionId: string
) {
  return db.missionTask.findFirst({
    where: { id: taskId, missionId },
  });
}

export function getMissionRun(db: Database, runId: string, missionId: string) {
  return db.missionRun.findFirst({
    where: { id: runId, missionId },
    select: { artifacts: true },
  });
}

export function listMissionMemory(
  db: Database,
  missionId: string,
  opts?: { scope?: string; agentId?: string }
) {
  return db.missionMemory.findMany({
    where: {
      missionId,
      ...(opts?.scope ? { scope: opts.scope } : {}),
      ...(opts?.agentId ? { agentId: opts.agentId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function getMission(db: Database, missionId: string, teamId: string) {
  return db.mission.findFirst({
    where: { id: missionId, teamId },
    include: {
      agents: {
        orderBy: { sortOrder: "asc" },
        include: { agent: { select: { id: true, status: true } } },
      },
      tasks: {
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        take: 50,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export function getMissionTasks(
  db: Database,
  input: {
    missionId: string;
    status?: MissionTaskStatus;
    assigneeId?: string;
    priority?: MissionTaskPriority;
  }
) {
  return db.missionTask.findMany({
    where: {
      missionId: input.missionId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    include: {
      assignee: { select: { id: true, name: true, role: true } },
    },
  });
}

export function getMissionPendingTasks(db: Database, missionId: string) {
  return db.missionTask.findMany({
    where: {
      missionId,
      status: { in: ["INBOX", "ASSIGNED"] },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    include: {
      assignee: { select: { id: true, name: true, role: true } },
    },
  });
}

export function getMissionActivity(
  db: Database,
  input: {
    missionId: string;
    limit?: number;
    cursor?: string;
  }
) {
  return db.missionActivity.findMany({
    where: {
      missionId: input.missionId,
      ...(input.cursor ? { id: { lt: input.cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 20,
  });
}

export function getMissionAgentNotifications(
  db: Database,
  input: {
    missionId: string;
    agentId: string;
  }
) {
  return db.missionComment.findMany({
    where: {
      task: { missionId: input.missionId },
      mentions: { has: input.agentId },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      task: { select: { id: true, title: true } },
    },
  });
}

export async function getMissionStats(db: Database, missionId: string) {
  const [taskCounts, runningRuns, totalRuns, mission] = await Promise.all([
    db.missionTask.groupBy({
      by: ["status"],
      where: { missionId },
      _count: { id: true },
    }),
    db.missionRun.count({
      where: { missionId, status: "RUNNING" },
    }),
    db.missionRun.count({
      where: { missionId },
    }),
    db.mission.findUnique({
      where: { id: missionId },
      select: { consumedCents: true, budgetCents: true },
    }),
  ]);

  const statusMap = Object.fromEntries(
    taskCounts.map((r) => [r.status, r._count.id])
  );

  return {
    tasks: {
      inbox: statusMap.INBOX ?? 0,
      assigned: statusMap.ASSIGNED ?? 0,
      inProgress: statusMap.IN_PROGRESS ?? 0,
      review: statusMap.REVIEW ?? 0,
      done: statusMap.DONE ?? 0,
      blocked: statusMap.BLOCKED ?? 0,
      cancelled: statusMap.CANCELLED ?? 0,
    },
    runs: {
      running: runningRuns,
      total: totalRuns,
    },
    budget: {
      consumed: mission?.consumedCents ?? 0,
      limit: mission?.budgetCents ?? null,
    },
  };
}

export function getMissionRunningRuns(db: Database, missionId: string) {
  return db.missionRun.count({
    where: { missionId, status: "RUNNING" },
  });
}

export async function getMissionIdleAgents(db: Database, missionId: string) {
  const busyAgentIds = await db.missionRun.findMany({
    where: { missionId, status: "RUNNING" },
    select: { agentId: true },
    distinct: ["agentId"],
  });

  const busyIds = new Set(busyAgentIds.map((r) => r.agentId));

  const allAgents = await db.missionAgent.findMany({
    where: { missionId },
    orderBy: { sortOrder: "asc" },
  });

  return allAgents.filter((a) => !busyIds.has(a.id));
}

export function getMissionMemory(
  db: Database,
  input: {
    missionId: string;
    agentId?: string;
    key: string;
    scope?: string;
  }
) {
  return db.missionMemory.findUnique({
    where: {
      missionId_agentId_key_scope: {
        missionId: input.missionId,
        agentId: input.agentId ?? "",
        key: input.key,
        scope: input.scope ?? "mission",
      },
    },
  });
}
