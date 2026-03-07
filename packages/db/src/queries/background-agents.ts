import type { BackgroundAgentStatus } from "@openbeam/types/db";
import type { Database } from "../index";

function buildStatusFilter(
  status?: BackgroundAgentStatus | BackgroundAgentStatus[]
): BackgroundAgentStatus | { in: BackgroundAgentStatus[] } | undefined {
  if (!status) {
    return;
  }
  if (Array.isArray(status)) {
    return { in: status };
  }
  return status;
}

export function findBackgroundAgentById(
  db: Database,
  id: string,
  teamId: string
) {
  return db.backgroundAgent.findFirst({
    where: { id, teamId },
    include: {
      checkpoints: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });
}

export function findBackgroundAgentWithLogs(
  db: Database,
  id: string,
  teamId: string,
  logLimit = 50
) {
  return db.backgroundAgent.findFirst({
    where: { id, teamId },
    include: {
      checkpoints: {
        orderBy: { version: "desc" },
        take: 1,
      },
      logs: {
        orderBy: { createdAt: "desc" },
        take: logLimit,
      },
    },
  });
}

export function listBackgroundAgents(
  db: Database,
  teamId: string,
  userId?: string,
  options: {
    status?: BackgroundAgentStatus | BackgroundAgentStatus[];
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 20, offset = 0 } = options;
  const statusFilter = buildStatusFilter(status);

  return db.backgroundAgent.findMany({
    where: {
      teamId,
      userId: userId ?? undefined,
      status: statusFilter,
    },
    select: {
      id: true,
      name: true,
      status: true,
      progress: true,
      currentStep: true,
      preset: true,
      inputTokens: true,
      outputTokens: true,
      estimatedCostUsd: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function listActiveBackgroundAgents(db: Database, teamId: string) {
  return db.backgroundAgent.findMany({
    where: {
      teamId,
      status: {
        in: ["PENDING", "INITIALIZING", "RUNNING", "PAUSED", "AWAITING_INPUT"],
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function countBackgroundAgents(
  db: Database,
  teamId: string,
  userId?: string,
  status?: BackgroundAgentStatus | BackgroundAgentStatus[]
) {
  const statusFilter = buildStatusFilter(status);

  return db.backgroundAgent.count({
    where: {
      teamId,
      userId: userId ?? undefined,
      status: statusFilter,
    },
  });
}

export function findTimedOutAgents(db: Database) {
  return db.backgroundAgent.findMany({
    where: {
      status: "RUNNING",
      timeoutAt: {
        lte: new Date(),
      },
    },
  });
}

export function getBackgroundAgentCheckpoints(
  db: Database,
  agentId: string,
  limit = 10
) {
  return db.backgroundAgentCheckpoint.findMany({
    where: { agentId },
    orderBy: { version: "desc" },
    take: limit,
    select: {
      id: true,
      version: true,
      stepIndex: true,
      description: true,
      createdAt: true,
    },
  });
}

export function getBackgroundAgentLogs(
  db: Database,
  agentId: string,
  options: {
    level?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { level, limit = 100, offset = 0 } = options;

  return db.backgroundAgentLog.findMany({
    where: {
      agentId,
      level: level ?? undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getBackgroundAgentUsageStats(
  db: Database,
  teamId: string,
  startDate?: Date,
  endDate?: Date
) {
  return db.backgroundAgent.aggregate({
    where: {
      teamId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: "COMPLETED",
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      estimatedCostUsd: true,
    },
    _count: true,
  });
}
