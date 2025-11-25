import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// === AI Query Types ===

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type StepType =
  | "SEARCH"
  | "READ"
  | "REASON"
  | "TOOL"
  | "SYNTHESIZE"
  | "VERIFY"
  | "ASK";

export interface AgentExecutionResult {
  id: string;
  agentId: string | null;
  teamId: string;
  userId: string;
  conversationId: string | null;
  task: string;
  taskType: string;
  status: ExecutionStatus;
  plan: Record<string, unknown>[];
  currentStep: number;
  totalSteps: number;
  result: string | null;
  errorMessage: string | null;
  totalTokens: number;
  durationMs: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface AgentStepResult {
  id: string;
  executionId: string;
  stepNumber: number;
  type: StepType;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  outputSummary: string | null;
  status: ExecutionStatus;
  toolId: string | null;
  toolName: string | null;
  tokensUsed: number;
  durationMs: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface ConversationResult {
  id: string;
  teamId: string;
  userId: string;
  assistantId: string | null;
  title: string | null;
  isArchived: boolean;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export interface MessageResult {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
  citations: Record<string, unknown>[];
  toolCalls: Record<string, unknown>[];
  tokensUsed: number | null;
  createdAt: Date;
}

// === AI Queries ===

/**
 * Get agent execution by ID
 */
export const getAgentExecution = async (
  db: Database,
  executionId: string
): Promise<AgentExecutionResult | null> => {
  const execution = await db.agentExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) return null;

  return {
    id: execution.id,
    agentId: execution.agentId,
    teamId: execution.teamId,
    userId: execution.userId,
    conversationId: execution.conversationId,
    task: execution.task,
    taskType: execution.taskType,
    status: execution.status as ExecutionStatus,
    plan: (execution.plan as Record<string, unknown>[]) || [],
    currentStep: execution.currentStep,
    totalSteps: execution.totalSteps,
    result: execution.result,
    errorMessage: execution.errorMessage,
    totalTokens: execution.totalTokens,
    durationMs: execution.durationMs,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    createdAt: execution.createdAt,
  };
};

/**
 * Get steps for an agent execution
 */
export const getAgentExecutionSteps = async (
  db: Database,
  executionId: string
): Promise<AgentStepResult[]> => {
  const steps = await db.agentStep.findMany({
    where: { executionId },
    orderBy: { stepNumber: "asc" },
  });

  return steps.map((s) => ({
    id: s.id,
    executionId: s.executionId,
    stepNumber: s.stepNumber,
    type: s.type as StepType,
    description: s.description,
    input: (s.input as Record<string, unknown>) || {},
    output: s.output as Record<string, unknown> | null,
    outputSummary: s.outputSummary,
    status: s.status as ExecutionStatus,
    toolId: s.toolId,
    toolName: s.toolName,
    tokensUsed: s.tokensUsed,
    durationMs: s.durationMs,
    errorMessage: s.errorMessage,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
  }));
};

/**
 * Get user's agent executions
 */
export const getUserAgentExecutions = async (
  db: Database,
  teamId: string,
  userId: string,
  options: { limit?: number; offset?: number; status?: ExecutionStatus } = {}
): Promise<{ executions: AgentExecutionResult[]; total: number }> => {
  const { limit = 20, offset = 0, status } = options;

  const where: Prisma.AgentExecutionWhereInput = { teamId, userId };
  if (status) {
    where.status = status;
  }

  const [executions, total] = await Promise.all([
    db.agentExecution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.agentExecution.count({ where }),
  ]);

  return {
    executions: executions.map((e) => ({
      id: e.id,
      agentId: e.agentId,
      teamId: e.teamId,
      userId: e.userId,
      conversationId: e.conversationId,
      task: e.task,
      taskType: e.taskType,
      status: e.status as ExecutionStatus,
      plan: (e.plan as Record<string, unknown>[]) || [],
      currentStep: e.currentStep,
      totalSteps: e.totalSteps,
      result: e.result,
      errorMessage: e.errorMessage,
      totalTokens: e.totalTokens,
      durationMs: e.durationMs,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      createdAt: e.createdAt,
    })),
    total,
  };
};

/**
 * Get conversation by ID
 */
export const getConversation = async (
  db: Database,
  conversationId: string
): Promise<ConversationResult | null> => {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      _count: { select: { messages: true } },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    teamId: conversation.teamId,
    userId: conversation.userId,
    assistantId: conversation.assistantId,
    title: conversation.title,
    isArchived: conversation.isArchived,
    messageCount: conversation._count.messages,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
  };
};

/**
 * Get user's conversations
 */
export const getUserConversations = async (
  db: Database,
  teamId: string,
  userId: string,
  options: { limit?: number; offset?: number; includeArchived?: boolean } = {}
): Promise<{ conversations: ConversationResult[]; total: number }> => {
  const { limit = 20, offset = 0, includeArchived = false } = options;

  const where: Prisma.ConversationWhereInput = { teamId, userId };
  if (!includeArchived) {
    where.isArchived = false;
  }

  const [conversations, total] = await Promise.all([
    db.conversation.findMany({
      where,
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.conversation.count({ where }),
  ]);

  return {
    conversations: conversations.map((c) => ({
      id: c.id,
      teamId: c.teamId,
      userId: c.userId,
      assistantId: c.assistantId,
      title: c.title,
      isArchived: c.isArchived,
      messageCount: c._count.messages,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    })),
    total,
  };
};

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (
  db: Database,
  conversationId: string,
  options: { limit?: number; offset?: number; order?: "asc" | "desc" } = {}
): Promise<{ messages: MessageResult[]; total: number }> => {
  const { limit = 50, offset = 0, order = "asc" } = options;

  const [messages, total] = await Promise.all([
    db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: order },
      take: limit,
      skip: offset,
    }),
    db.message.count({
      where: { conversationId },
    }),
  ]);

  return {
    messages: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      metadata: (m.metadata as Record<string, unknown>) || {},
      citations: (m.citations as Record<string, unknown>[]) || [],
      toolCalls: (m.toolCalls as Record<string, unknown>[]) || [],
      tokensUsed: m.tokensUsed,
      createdAt: m.createdAt,
    })),
    total,
  };
};

/**
 * Get agent by ID
 */
export const getAgent = async (
  db: Database,
  agentId: string
): Promise<{
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  instructions: string;
  capabilities: string[];
  tools: string[];
  modelConfig: Record<string, unknown>;
  isPublic: boolean;
  isEnabled: boolean;
  usageCount: number;
} | null> => {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) return null;

  return {
    id: agent.id,
    teamId: agent.teamId,
    name: agent.name,
    description: agent.description,
    instructions: agent.instructions,
    capabilities: agent.capabilities,
    tools: agent.tools,
    modelConfig: (agent.modelConfig as Record<string, unknown>) || {},
    isPublic: agent.isPublic,
    isEnabled: agent.isEnabled,
    usageCount: agent.usageCount,
  };
};

/**
 * Get available agents for a team
 */
export const getTeamAgents = async (
  db: Database,
  teamId: string,
  options: { includeDisabled?: boolean; includePublic?: boolean } = {}
): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    isPublic: boolean;
    isEnabled: boolean;
    usageCount: number;
  }>
> => {
  const { includeDisabled = false, includePublic = true } = options;

  const where: Prisma.AgentWhereInput = {};

  if (includePublic) {
    where.OR = [{ teamId }, { isPublic: true }];
  } else {
    where.teamId = teamId;
  }

  if (!includeDisabled) {
    where.isEnabled = true;
  }

  const agents = await db.agent.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      isPublic: true,
      isEnabled: true,
      usageCount: true,
    },
    orderBy: { usageCount: "desc" },
  });

  return agents;
};

/**
 * Get assistant by ID
 */
export const getAssistant = async (
  db: Database,
  assistantId: string
): Promise<{
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  instructions: string;
  model: string;
  temperature: number;
  maxTokens: number | null;
  tools: string[];
  isPublic: boolean;
  isEnabled: boolean;
} | null> => {
  const assistant = await db.assistant.findUnique({
    where: { id: assistantId },
  });

  if (!assistant) return null;

  return {
    id: assistant.id,
    teamId: assistant.teamId,
    name: assistant.name,
    description: assistant.description,
    instructions: assistant.instructions,
    model: assistant.model,
    temperature: assistant.temperature,
    maxTokens: assistant.maxTokens,
    tools: assistant.tools,
    isPublic: assistant.isPublic,
    isEnabled: assistant.isEnabled,
  };
};
