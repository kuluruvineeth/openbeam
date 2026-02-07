import type { Prisma, WorkflowAuditLog } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface GetWorkflowAuditLogsOptions {
  workflowId?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export const getWorkflowAuditLogs = (
  db: Database,
  teamId: string,
  options: GetWorkflowAuditLogsOptions = {}
): Promise<WorkflowAuditLog[]> => {
  const {
    workflowId,
    action,
    userId,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  const where: Prisma.WorkflowAuditLogWhereInput = { teamId };

  if (workflowId) {
    where.workflowId = workflowId;
  }

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  return db.workflowAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

export const getWorkflowAuditLogsByWorkflow = (
  db: Database,
  teamId: string,
  workflowId: string,
  options: Omit<GetWorkflowAuditLogsOptions, "workflowId"> = {}
): Promise<WorkflowAuditLog[]> => {
  const { action, startDate, endDate, limit = 100, offset = 0 } = options;

  const where: Prisma.WorkflowAuditLogWhereInput = { teamId, workflowId };

  if (action) {
    where.action = action;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  return db.workflowAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

export const countWorkflowAuditLogsByAction = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<Record<string, number>> => {
  const { startDate, endDate } = options;

  const where: Prisma.WorkflowAuditLogWhereInput = { teamId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const results = await db.workflowAuditLog.groupBy({
    by: ["action"],
    where,
    _count: true,
  });

  return Object.fromEntries(results.map((r) => [r.action, r._count]));
};

export const getRecentWorkflowAuditLogs = (
  db: Database,
  teamId: string,
  limit = 50
): Promise<WorkflowAuditLog[]> =>
  db.workflowAuditLog.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const getWorkflowAuditLogCountByTeam = (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<number> => {
  const { startDate, endDate } = options;

  const where: Prisma.WorkflowAuditLogWhereInput = { teamId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  return db.workflowAuditLog.count({ where });
};

export const getExecutionAuditLogs = (
  db: Database,
  teamId: string,
  options: {
    executionId?: string;
    action?: string;
    actor?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
): Promise<WorkflowAuditLog[]> => {
  const {
    executionId,
    action,
    actor,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  const where: Prisma.WorkflowAuditLogWhereInput = { teamId };

  if (action) {
    where.action = action;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  if (executionId && actor) {
    where.AND = [
      { metadata: { path: ["executionId"], equals: executionId } },
      { metadata: { path: ["actor"], string_contains: actor } },
    ];
  } else if (executionId) {
    where.metadata = { path: ["executionId"], equals: executionId };
  } else if (actor) {
    where.metadata = { path: ["actor"], string_contains: actor };
  }

  return db.workflowAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

export const getRecentExecutionErrors = (
  db: Database,
  teamId: string,
  limit = 50
): Promise<WorkflowAuditLog[]> =>
  db.workflowAuditLog.findMany({
    where: {
      teamId,
      action: {
        in: [
          "execution_failed",
          "node_failed",
          "tool_failed",
          "policy_violated",
          "budget_exceeded",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const countExecutionAuditLogsByAction = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<Record<string, number>> => {
  const { startDate, endDate } = options;

  const where: Prisma.WorkflowAuditLogWhereInput = {
    teamId,
    action: {
      in: [
        "execution_started",
        "execution_completed",
        "execution_failed",
        "execution_cancelled",
        "tool_called",
        "tool_completed",
        "tool_failed",
        "approval_requested",
        "approval_granted",
        "approval_rejected",
        "approval_expired",
        "policy_violated",
        "budget_exceeded",
      ],
    },
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const results = await db.workflowAuditLog.groupBy({
    by: ["action"],
    where,
    _count: true,
  });

  return Object.fromEntries(results.map((r) => [r.action, r._count]));
};
