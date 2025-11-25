import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// === Assistant Query Types ===

export type AssistantVisibility = "PRIVATE" | "TEAM" | "PUBLIC";

export interface AssistantResult {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  systemPrompt: string;
  personality: string | null;
  instructions: string | null;
  visibility: AssistantVisibility;
  capabilities: string[];
  connectorIds: string[];
  documentTypes: string[];
  modelConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  examplePrompts: string[];
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssistantSummaryResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  visibility: AssistantVisibility;
  capabilities: string[];
  usageCount: number;
  createdAt: Date;
}

// === Assistant Queries ===

/**
 * Get assistant by ID
 */
export const getAssistantById = async (
  db: Database,
  assistantId: string
): Promise<AssistantResult | null> => {
  const assistant = await db.assistant.findUnique({
    where: { id: assistantId },
  });

  if (!assistant) {
    return null;
  }

  return mapAssistantResult(assistant);
};

/**
 * Get assistant by slug within a team
 */
export const getAssistantBySlug = async (
  db: Database,
  teamId: string,
  slug: string
): Promise<AssistantResult | null> => {
  const assistant = await db.assistant.findFirst({
    where: { teamId, slug, isActive: true },
  });

  if (!assistant) {
    return null;
  }

  return mapAssistantResult(assistant);
};

/**
 * List assistants for a team
 */
export const listTeamAssistants = async (
  db: Database,
  teamId: string,
  options: {
    visibility?: AssistantVisibility;
    includeInactive?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ assistants: AssistantSummaryResult[]; total: number }> => {
  const {
    visibility,
    includeInactive = false,
    limit = 20,
    offset = 0,
  } = options;

  const where: Prisma.AssistantWhereInput = {
    teamId,
    ...(visibility && { visibility }),
    ...(!includeInactive && { isActive: true }),
  };

  const [assistants, total] = await Promise.all([
    db.assistant.findMany({
      where,
      orderBy: { usageCount: "desc" },
      take: limit,
      skip: offset,
    }),
    db.assistant.count({ where }),
  ]);

  return {
    assistants: assistants.map(mapAssistantSummary),
    total,
  };
};

/**
 * List public and team-visible assistants
 */
export const listAvailableAssistants = async (
  db: Database,
  teamId: string,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ assistants: AssistantSummaryResult[]; total: number }> => {
  const { limit = 20, offset = 0 } = options;

  const where: Prisma.AssistantWhereInput = {
    isActive: true,
    OR: [
      { teamId, createdBy: userId },
      { teamId, visibility: "TEAM" },
      { visibility: "PUBLIC" },
    ],
  };

  const [assistants, total] = await Promise.all([
    db.assistant.findMany({
      where,
      orderBy: { usageCount: "desc" },
      take: limit,
      skip: offset,
    }),
    db.assistant.count({ where }),
  ]);

  return {
    assistants: assistants.map(mapAssistantSummary),
    total,
  };
};

/**
 * Get popular assistants
 */
export const getPopularAssistants = async (
  db: Database,
  teamId: string,
  options: { limit?: number } = {}
): Promise<AssistantSummaryResult[]> => {
  const { limit = 10 } = options;

  const assistants = await db.assistant.findMany({
    where: {
      isActive: true,
      OR: [{ teamId }, { visibility: "PUBLIC" }],
    },
    orderBy: { usageCount: "desc" },
    take: limit,
  });

  return assistants.map(mapAssistantSummary);
};

/**
 * Check if user owns assistant
 */
export const isAssistantOwner = async (
  db: Database,
  assistantId: string,
  userId: string
): Promise<boolean> => {
  const assistant = await db.assistant.findFirst({
    where: { id: assistantId, createdBy: userId },
    select: { id: true },
  });

  return !!assistant;
};

// === Helper Functions ===

function mapAssistantResult(assistant: {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  systemPrompt: string;
  personality: string | null;
  instructions: string | null;
  visibility: string;
  capabilities: unknown;
  connectorIds: string[];
  documentTypes: string[];
  modelConfig: unknown;
  examplePrompts: unknown;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AssistantResult {
  const modelConfig =
    (assistant.modelConfig as {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }) || {};

  return {
    id: assistant.id,
    teamId: assistant.teamId,
    createdBy: assistant.createdBy,
    name: assistant.name,
    slug: assistant.slug,
    description: assistant.description,
    avatar: assistant.avatar,
    systemPrompt: assistant.systemPrompt,
    personality: assistant.personality,
    instructions: assistant.instructions,
    visibility: assistant.visibility as AssistantVisibility,
    capabilities: (assistant.capabilities as string[]) || [],
    connectorIds: assistant.connectorIds,
    documentTypes: assistant.documentTypes,
    modelConfig: {
      model: modelConfig.model || "gpt-4",
      temperature: modelConfig.temperature ?? 0.7,
      maxTokens: modelConfig.maxTokens ?? 4096,
    },
    examplePrompts: (assistant.examplePrompts as string[]) || [],
    usageCount: assistant.usageCount,
    isActive: assistant.isActive,
    createdAt: assistant.createdAt,
    updatedAt: assistant.updatedAt,
  };
}

function mapAssistantSummary(assistant: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  visibility: string;
  capabilities: unknown;
  usageCount: number;
  createdAt: Date;
}): AssistantSummaryResult {
  return {
    id: assistant.id,
    name: assistant.name,
    slug: assistant.slug,
    description: assistant.description,
    avatar: assistant.avatar,
    visibility: assistant.visibility as AssistantVisibility,
    capabilities: (assistant.capabilities as string[]) || [],
    usageCount: assistant.usageCount,
    createdAt: assistant.createdAt,
  };
}
