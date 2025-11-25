import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// === Action Query Types ===

export type ActionExecutionStatus =
  | "PENDING"
  | "AWAITING_CONFIRMATION"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ROLLED_BACK";

export type ActionCategory =
  | "COMMUNICATION"
  | "DOCUMENT"
  | "TASK"
  | "DATA"
  | "INTEGRATION"
  | "SYSTEM"
  | "CUSTOM";

export type ExecutionType = "API" | "WEBHOOK" | "FUNCTION" | "MCP";

export interface ActionResult {
  id: string;
  teamId: string;
  name: string;
  displayName: string;
  description: string | null;
  category: ActionCategory;
  executionType: ExecutionType;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown> | null;
  executionConfig: Record<string, unknown>;
  confirmationRequired: boolean;
  isDestructive: boolean;
  rateLimit: Record<string, unknown> | null;
  isEnabled: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
}

export interface ActionExecutionResult {
  id: string;
  actionId: string;
  teamId: string;
  userId: string;
  status: ActionExecutionStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  outputSummary: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  isRollbackable: boolean;
  rollbackData: Record<string, unknown> | null;
  confirmedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  createdAt: Date;
}

// === Action Queries ===

/**
 * Get action by ID
 */
export const getAction = async (
  db: Database,
  actionId: string
): Promise<ActionResult | null> => {
  const action = await db.action.findUnique({
    where: { id: actionId },
  });

  if (!action) {
    return null;
  }

  return {
    id: action.id,
    teamId: action.teamId,
    name: action.name,
    displayName: action.displayName,
    description: action.description,
    category: action.category as ActionCategory,
    executionType: action.executionType as ExecutionType,
    inputSchema: (action.inputSchema as Record<string, unknown>) || {},
    outputSchema: action.outputSchema as Record<string, unknown> | null,
    executionConfig: (action.executionConfig as Record<string, unknown>) || {},
    confirmationRequired: action.confirmationRequired,
    isDestructive: action.isDestructive,
    rateLimit: action.rateLimit as Record<string, unknown> | null,
    isEnabled: action.isEnabled,
    usageCount: action.usageCount,
    lastUsedAt: action.lastUsedAt,
  };
};

/**
 * Get action by name (unique within team)
 */
export const getActionByName = async (
  db: Database,
  teamId: string,
  name: string
): Promise<ActionResult | null> => {
  const action = await db.action.findFirst({
    where: { teamId, name },
  });

  if (!action) {
    return null;
  }

  return {
    id: action.id,
    teamId: action.teamId,
    name: action.name,
    displayName: action.displayName,
    description: action.description,
    category: action.category as ActionCategory,
    executionType: action.executionType as ExecutionType,
    inputSchema: (action.inputSchema as Record<string, unknown>) || {},
    outputSchema: action.outputSchema as Record<string, unknown> | null,
    executionConfig: (action.executionConfig as Record<string, unknown>) || {},
    confirmationRequired: action.confirmationRequired,
    isDestructive: action.isDestructive,
    rateLimit: action.rateLimit as Record<string, unknown> | null,
    isEnabled: action.isEnabled,
    usageCount: action.usageCount,
    lastUsedAt: action.lastUsedAt,
  };
};

/**
 * Get all actions for a team
 */
export const getTeamActions = async (
  db: Database,
  teamId: string,
  options: {
    category?: ActionCategory;
    includeDisabled?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ actions: ActionResult[]; total: number }> => {
  const { category, includeDisabled = false, limit = 50, offset = 0 } = options;

  const where: Prisma.ActionWhereInput = { teamId };
  if (category) {
    where.category = category;
  }
  if (!includeDisabled) {
    where.isEnabled = true;
  }

  const [actions, total] = await Promise.all([
    db.action.findMany({
      where,
      orderBy: { usageCount: "desc" },
      take: limit,
      skip: offset,
    }),
    db.action.count({ where }),
  ]);

  return {
    actions: actions.map((a) => ({
      id: a.id,
      teamId: a.teamId,
      name: a.name,
      displayName: a.displayName,
      description: a.description,
      category: a.category as ActionCategory,
      executionType: a.executionType as ExecutionType,
      inputSchema: (a.inputSchema as Record<string, unknown>) || {},
      outputSchema: a.outputSchema as Record<string, unknown> | null,
      executionConfig: (a.executionConfig as Record<string, unknown>) || {},
      confirmationRequired: a.confirmationRequired,
      isDestructive: a.isDestructive,
      rateLimit: a.rateLimit as Record<string, unknown> | null,
      isEnabled: a.isEnabled,
      usageCount: a.usageCount,
      lastUsedAt: a.lastUsedAt,
    })),
    total,
  };
};

/**
 * Get action execution by ID
 */
export const getActionExecution = async (
  db: Database,
  executionId: string
): Promise<ActionExecutionResult | null> => {
  const execution = await db.actionExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) {
    return null;
  }

  return {
    id: execution.id,
    actionId: execution.actionId,
    teamId: execution.teamId,
    userId: execution.userId,
    status: execution.status as ActionExecutionStatus,
    input: (execution.input as Record<string, unknown>) || {},
    output: execution.output as Record<string, unknown> | null,
    outputSummary: execution.outputSummary,
    errorCode: execution.errorCode,
    errorMessage: execution.errorMessage,
    isRollbackable: execution.isRollbackable,
    rollbackData: execution.rollbackData as Record<string, unknown> | null,
    confirmedAt: execution.confirmedAt,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    durationMs: execution.durationMs,
    createdAt: execution.createdAt,
  };
};

/**
 * Get user's action executions
 */
export const getUserActionExecutions = async (
  db: Database,
  teamId: string,
  userId: string,
  options: {
    actionId?: string;
    status?: ActionExecutionStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ executions: ActionExecutionResult[]; total: number }> => {
  const { actionId, status, limit = 20, offset = 0 } = options;

  const where: Prisma.ActionExecutionWhereInput = { teamId, userId };
  if (actionId) {
    where.actionId = actionId;
  }
  if (status) {
    where.status = status;
  }

  const [executions, total] = await Promise.all([
    db.actionExecution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.actionExecution.count({ where }),
  ]);

  return {
    executions: executions.map((e) => ({
      id: e.id,
      actionId: e.actionId,
      teamId: e.teamId,
      userId: e.userId,
      status: e.status as ActionExecutionStatus,
      input: (e.input as Record<string, unknown>) || {},
      output: e.output as Record<string, unknown> | null,
      outputSummary: e.outputSummary,
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
      isRollbackable: e.isRollbackable,
      rollbackData: e.rollbackData as Record<string, unknown> | null,
      confirmedAt: e.confirmedAt,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      durationMs: e.durationMs,
      createdAt: e.createdAt,
    })),
    total,
  };
};

/**
 * Get executions awaiting confirmation
 */
export const getPendingConfirmations = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<ActionExecutionResult[]> => {
  const executions = await db.actionExecution.findMany({
    where: {
      teamId,
      userId,
      status: "AWAITING_CONFIRMATION",
    },
    orderBy: { createdAt: "desc" },
  });

  return executions.map((e) => ({
    id: e.id,
    actionId: e.actionId,
    teamId: e.teamId,
    userId: e.userId,
    status: e.status as ActionExecutionStatus,
    input: (e.input as Record<string, unknown>) || {},
    output: e.output as Record<string, unknown> | null,
    outputSummary: e.outputSummary,
    errorCode: e.errorCode,
    errorMessage: e.errorMessage,
    isRollbackable: e.isRollbackable,
    rollbackData: e.rollbackData as Record<string, unknown> | null,
    confirmedAt: e.confirmedAt,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    durationMs: e.durationMs,
    createdAt: e.createdAt,
  }));
};

/**
 * Get rollbackable executions
 */
export const getRollbackableExecutions = async (
  db: Database,
  teamId: string,
  userId: string,
  options: { limit?: number } = {}
): Promise<ActionExecutionResult[]> => {
  const { limit = 10 } = options;

  const executions = await db.actionExecution.findMany({
    where: {
      teamId,
      userId,
      isRollbackable: true,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    take: limit,
  });

  return executions.map((e) => ({
    id: e.id,
    actionId: e.actionId,
    teamId: e.teamId,
    userId: e.userId,
    status: e.status as ActionExecutionStatus,
    input: (e.input as Record<string, unknown>) || {},
    output: e.output as Record<string, unknown> | null,
    outputSummary: e.outputSummary,
    errorCode: e.errorCode,
    errorMessage: e.errorMessage,
    isRollbackable: e.isRollbackable,
    rollbackData: e.rollbackData as Record<string, unknown> | null,
    confirmedAt: e.confirmedAt,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    durationMs: e.durationMs,
    createdAt: e.createdAt,
  }));
};

/**
 * Get action usage stats
 */
export const getActionUsageStats = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<
  Array<{
    actionId: string;
    actionName: string;
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    avgDurationMs: number;
  }>
> => {
  const where: Prisma.ActionExecutionWhereInput = { teamId };

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const stats = await db.actionExecution.groupBy({
    by: ["actionId"],
    where,
    _count: { id: true },
    _avg: { durationMs: true },
  });

  // Get action names
  const actionIds = stats.map((s) => s.actionId);
  const actions = await db.action.findMany({
    where: { id: { in: actionIds } },
    select: { id: true, name: true },
  });

  const actionMap = new Map(actions.map((a) => [a.id, a.name]));

  // Get success/failure counts
  const successCounts = await db.actionExecution.groupBy({
    by: ["actionId"],
    where: { ...where, status: "COMPLETED" },
    _count: { id: true },
  });

  const failureCounts = await db.actionExecution.groupBy({
    by: ["actionId"],
    where: { ...where, status: "FAILED" },
    _count: { id: true },
  });

  const successMap = new Map(
    successCounts.map((s) => [s.actionId, s._count.id])
  );
  const failureMap = new Map(
    failureCounts.map((s) => [s.actionId, s._count.id])
  );

  return stats.map((s) => ({
    actionId: s.actionId,
    actionName: actionMap.get(s.actionId) || "Unknown",
    totalExecutions: s._count.id,
    successCount: successMap.get(s.actionId) || 0,
    failureCount: failureMap.get(s.actionId) || 0,
    avgDurationMs: s._avg.durationMs || 0,
  }));
};
