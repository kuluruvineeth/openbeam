import type { Database } from "../index";
import type { ActionExecutionStatus } from "../queries/actions";

// === Action Mutation Types ===

export interface CreateActionExecutionInput {
  actionId: string;
  teamId: string;
  userId: string;
  input: Record<string, unknown>;
  status?: ActionExecutionStatus;
}

export interface UpdateActionExecutionInput {
  status?: ActionExecutionStatus;
  output?: Record<string, unknown> | null;
  outputSummary?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  isRollbackable?: boolean;
  rollbackData?: Record<string, unknown> | null;
  confirmedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
}

// === Action Mutations ===

/**
 * Create an action execution
 */
export const createActionExecution = async (
  db: Database,
  input: CreateActionExecutionInput
): Promise<string> => {
  const execution = await db.actionExecution.create({
    data: {
      actionId: input.actionId,
      teamId: input.teamId,
      userId: input.userId,
      input: input.input,
      status: input.status || "PENDING",
    },
  });

  return execution.id;
};

/**
 * Update an action execution
 */
export const updateActionExecution = async (
  db: Database,
  executionId: string,
  input: UpdateActionExecutionInput
): Promise<void> => {
  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark execution as awaiting confirmation
 */
export const setAwaitingConfirmation = async (
  db: Database,
  executionId: string
): Promise<void> => {
  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      status: "AWAITING_CONFIRMATION",
      updatedAt: new Date(),
    },
  });
};

/**
 * Confirm an action execution
 */
export const confirmActionExecution = async (
  db: Database,
  executionId: string
): Promise<void> => {
  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      confirmedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Start an action execution
 */
export const startActionExecution = async (
  db: Database,
  executionId: string
): Promise<void> => {
  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Complete an action execution
 */
export const completeActionExecution = async (
  db: Database,
  executionId: string,
  result: {
    output: Record<string, unknown>;
    outputSummary: string;
    isRollbackable?: boolean;
    rollbackData?: Record<string, unknown> | null;
  }
): Promise<void> => {
  const execution = await db.actionExecution.findUnique({
    where: { id: executionId },
    select: { startedAt: true },
  });

  const durationMs = execution?.startedAt
    ? Date.now() - execution.startedAt.getTime()
    : null;

  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      status: "COMPLETED",
      output: result.output,
      outputSummary: result.outputSummary,
      isRollbackable: result.isRollbackable,
      rollbackData: result.rollbackData,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Fail an action execution
 */
export const failActionExecution = async (
  db: Database,
  executionId: string,
  error: { code: string; message: string }
): Promise<void> => {
  const execution = await db.actionExecution.findUnique({
    where: { id: executionId },
    select: { startedAt: true },
  });

  const durationMs = execution?.startedAt
    ? Date.now() - execution.startedAt.getTime()
    : null;

  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      status: "FAILED",
      errorCode: error.code,
      errorMessage: error.message,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Cancel an action execution
 */
export const cancelActionExecution = async (
  db: Database,
  executionId: string
): Promise<void> => {
  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      status: "CANCELLED",
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark execution as rolled back
 */
export const markRolledBack = async (
  db: Database,
  executionId: string
): Promise<void> => {
  await db.actionExecution.update({
    where: { id: executionId },
    data: {
      status: "ROLLED_BACK",
      isRollbackable: false,
      updatedAt: new Date(),
    },
  });
};

/**
 * Update action usage stats
 */
export const updateActionUsage = async (
  db: Database,
  actionId: string
): Promise<void> => {
  await db.action.update({
    where: { id: actionId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Enable an action
 */
export const enableAction = async (
  db: Database,
  actionId: string
): Promise<void> => {
  await db.action.update({
    where: { id: actionId },
    data: {
      isEnabled: true,
      updatedAt: new Date(),
    },
  });
};

/**
 * Disable an action
 */
export const disableAction = async (
  db: Database,
  actionId: string
): Promise<void> => {
  await db.action.update({
    where: { id: actionId },
    data: {
      isEnabled: false,
      updatedAt: new Date(),
    },
  });
};

/**
 * Delete old action executions
 */
export const deleteOldActionExecutions = async (
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<number> => {
  const result = await db.actionExecution.deleteMany({
    where: {
      teamId,
      createdAt: { lt: olderThan },
    },
  });

  return result.count;
};
