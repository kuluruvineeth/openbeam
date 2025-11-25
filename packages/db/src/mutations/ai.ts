import type { Database } from "../index";
import type { ExecutionStatus, StepType } from "../queries/ai";

// === AI Mutation Types ===

export interface CreateAgentExecutionInput {
  agentId?: string | null;
  teamId: string;
  userId: string;
  conversationId?: string | null;
  task: string;
  taskType: string;
  plan?: Record<string, unknown>[];
}

export interface UpdateAgentExecutionInput {
  status?: ExecutionStatus;
  plan?: Record<string, unknown>[];
  currentStep?: number;
  totalSteps?: number;
  result?: string | null;
  errorMessage?: string | null;
  totalTokens?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
}

export interface CreateAgentStepInput {
  executionId: string;
  stepNumber: number;
  type: StepType;
  description: string;
  input?: Record<string, unknown>;
  toolId?: string | null;
  toolName?: string | null;
}

export interface UpdateAgentStepInput {
  status?: ExecutionStatus;
  output?: Record<string, unknown> | null;
  outputSummary?: string | null;
  tokensUsed?: number;
  errorMessage?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  durationMs?: number | null;
}

export interface CreateConversationInput {
  teamId: string;
  userId: string;
  assistantId?: string | null;
  title?: string | null;
}

export interface CreateMessageInput {
  conversationId: string;
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  citations?: Record<string, unknown>[];
  toolCalls?: Record<string, unknown>[];
  tokensUsed?: number | null;
}

// === AI Mutations ===

/**
 * Create an agent execution
 */
export const createAgentExecution = async (
  db: Database,
  input: CreateAgentExecutionInput
): Promise<string> => {
  const execution = await db.agentExecution.create({
    data: {
      agentId: input.agentId,
      teamId: input.teamId,
      userId: input.userId,
      conversationId: input.conversationId,
      task: input.task,
      taskType: input.taskType,
      plan: input.plan || [],
      totalSteps: input.plan?.length || 0,
      status: "PENDING",
    },
  });

  return execution.id;
};

/**
 * Update an agent execution
 */
export const updateAgentExecution = async (
  db: Database,
  executionId: string,
  input: UpdateAgentExecutionInput
): Promise<void> => {
  await db.agentExecution.update({
    where: { id: executionId },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark execution as running
 */
export const startAgentExecution = async (
  db: Database,
  executionId: string
): Promise<void> => {
  await db.agentExecution.update({
    where: { id: executionId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark execution as completed
 */
export const completeAgentExecution = async (
  db: Database,
  executionId: string,
  result: string,
  totalTokens: number
): Promise<void> => {
  const execution = await db.agentExecution.findUnique({
    where: { id: executionId },
    select: { startedAt: true },
  });

  const durationMs = execution?.startedAt
    ? Date.now() - execution.startedAt.getTime()
    : null;

  await db.agentExecution.update({
    where: { id: executionId },
    data: {
      status: "COMPLETED",
      result,
      totalTokens,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark execution as failed
 */
export const failAgentExecution = async (
  db: Database,
  executionId: string,
  errorMessage: string
): Promise<void> => {
  const execution = await db.agentExecution.findUnique({
    where: { id: executionId },
    select: { startedAt: true },
  });

  const durationMs = execution?.startedAt
    ? Date.now() - execution.startedAt.getTime()
    : null;

  await db.agentExecution.update({
    where: { id: executionId },
    data: {
      status: "FAILED",
      errorMessage,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Create an agent step
 */
export const createAgentStep = async (
  db: Database,
  input: CreateAgentStepInput
): Promise<string> => {
  const step = await db.agentStep.create({
    data: {
      executionId: input.executionId,
      stepNumber: input.stepNumber,
      type: input.type,
      description: input.description,
      input: input.input || {},
      toolId: input.toolId,
      toolName: input.toolName,
      status: "PENDING",
    },
  });

  return step.id;
};

/**
 * Update an agent step
 */
export const updateAgentStep = async (
  db: Database,
  stepId: string,
  input: UpdateAgentStepInput
): Promise<void> => {
  await db.agentStep.update({
    where: { id: stepId },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark step as running
 */
export const startAgentStep = async (
  db: Database,
  stepId: string
): Promise<void> => {
  await db.agentStep.update({
    where: { id: stepId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark step as completed
 */
export const completeAgentStep = async (
  db: Database,
  stepId: string,
  output: Record<string, unknown>,
  outputSummary: string,
  tokensUsed: number
): Promise<void> => {
  const step = await db.agentStep.findUnique({
    where: { id: stepId },
    select: { startedAt: true },
  });

  const durationMs = step?.startedAt
    ? Date.now() - step.startedAt.getTime()
    : null;

  await db.agentStep.update({
    where: { id: stepId },
    data: {
      status: "COMPLETED",
      output,
      outputSummary,
      tokensUsed,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark step as failed
 */
export const failAgentStep = async (
  db: Database,
  stepId: string,
  errorMessage: string
): Promise<void> => {
  const step = await db.agentStep.findUnique({
    where: { id: stepId },
    select: { startedAt: true },
  });

  const durationMs = step?.startedAt
    ? Date.now() - step.startedAt.getTime()
    : null;

  await db.agentStep.update({
    where: { id: stepId },
    data: {
      status: "FAILED",
      errorMessage,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Create a conversation
 */
export const createConversation = async (
  db: Database,
  input: CreateConversationInput
): Promise<string> => {
  const conversation = await db.conversation.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      assistantId: input.assistantId,
      title: input.title,
    },
  });

  return conversation.id;
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (
  db: Database,
  conversationId: string,
  title: string
): Promise<void> => {
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      title,
      updatedAt: new Date(),
    },
  });
};

/**
 * Archive a conversation
 */
export const archiveConversation = async (
  db: Database,
  conversationId: string
): Promise<void> => {
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      isArchived: true,
      updatedAt: new Date(),
    },
  });
};

/**
 * Unarchive a conversation
 */
export const unarchiveConversation = async (
  db: Database,
  conversationId: string
): Promise<void> => {
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      isArchived: false,
      updatedAt: new Date(),
    },
  });
};

/**
 * Delete a conversation and its messages
 */
export const deleteConversation = async (
  db: Database,
  conversationId: string
): Promise<void> => {
  await db.$transaction([
    db.message.deleteMany({ where: { conversationId } }),
    db.conversation.delete({ where: { id: conversationId } }),
  ]);
};

/**
 * Add a message to a conversation
 */
export const addMessage = async (
  db: Database,
  input: CreateMessageInput
): Promise<string> => {
  const [message] = await db.$transaction([
    db.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata || {},
        citations: input.citations || [],
        toolCalls: input.toolCalls || [],
        tokensUsed: input.tokensUsed,
      },
    }),
    db.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      },
    }),
  ]);

  return message.id;
};

/**
 * Update agent usage count
 */
export const incrementAgentUsage = async (
  db: Database,
  agentId: string
): Promise<void> => {
  await db.agent.update({
    where: { id: agentId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Delete old agent executions
 */
export const deleteOldAgentExecutions = async (
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<number> => {
  // First delete steps
  await db.agentStep.deleteMany({
    where: {
      execution: {
        teamId,
        createdAt: { lt: olderThan },
      },
    },
  });

  // Then delete executions
  const result = await db.agentExecution.deleteMany({
    where: {
      teamId,
      createdAt: { lt: olderThan },
    },
  });

  return result.count;
};
