/**
 * Assistants Service
 * Business logic for AI assistants management
 *
 * Uses @openplane/db for all database operations.
 */

import prisma, {
  type AssistantResult,
  type AssistantSummaryResult,
  type AssistantVisibility,
  createAssistant as dbCreateAssistant,
  updateAssistant as dbUpdateAssistant,
  deactivateAssistant,
  getAssistantById,
  incrementAssistantUsage,
  listTeamAssistants,
} from "@openplane/db";
import type { AssistantDetail, AssistantSummary } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface ListAssistantsOptions {
  visibility?: "private" | "team" | "public";
  limit?: number;
  offset?: number;
}

export interface CreateAssistantParams {
  name: string;
  description?: string;
  systemPrompt: string;
  personality?: string;
  instructions?: string;
  connectorIds?: string[];
  documentTypes?: string[];
  modelConfig?: { model: string; temperature: number; maxTokens: number };
  examplePrompts?: string[];
  visibility?: "private" | "team" | "public";
  avatar?: string;
}

export interface UpdateAssistantParams {
  name?: string;
  description?: string;
  systemPrompt?: string;
  personality?: string;
  instructions?: string;
  connectorIds?: string[];
  documentTypes?: string[];
  modelConfig?: { model: string; temperature: number; maxTokens: number };
  examplePrompts?: string[];
  visibility?: "private" | "team" | "public";
  avatar?: string;
}

// ============================================================================
// Assistants Service Functions
// ============================================================================

/**
 * List assistants for a team
 */
export async function listAssistants(
  teamId: string,
  options: ListAssistantsOptions = {}
): Promise<{ assistants: AssistantSummary[]; total: number }> {
  const { visibility, limit = 20, offset = 0 } = options;

  const visibilityMap: Record<string, AssistantVisibility> = {
    private: "PRIVATE",
    team: "TEAM",
    public: "PUBLIC",
  };

  const result = await listTeamAssistants(prisma, teamId, {
    visibility: visibility ? visibilityMap[visibility] : undefined,
    limit,
    offset,
  });

  return {
    assistants: result.assistants.map(mapAssistantSummary),
    total: result.total,
  };
}

/**
 * Get assistant by ID
 */
export async function getAssistant(
  assistantId: string,
  teamId: string
): Promise<AssistantDetail | null> {
  const assistant = await getAssistantById(prisma, assistantId);

  if (!assistant || assistant.teamId !== teamId) {
    return null;
  }

  return mapAssistantDetail(assistant);
}

/**
 * Create an assistant
 */
export async function createAssistant(
  teamId: string,
  userId: string,
  params: CreateAssistantParams
): Promise<AssistantDetail> {
  const slug = generateSlug(params.name);

  const visibilityMap: Record<string, AssistantVisibility> = {
    private: "PRIVATE",
    team: "TEAM",
    public: "PUBLIC",
  };

  const assistantId = await dbCreateAssistant(prisma, {
    teamId,
    createdBy: userId,
    name: params.name,
    slug,
    description: params.description,
    avatar: params.avatar,
    systemPrompt: params.systemPrompt,
    personality: params.personality,
    instructions: params.instructions,
    visibility: visibilityMap[params.visibility || "private"],
    connectorIds: params.connectorIds,
    documentTypes: params.documentTypes,
    modelConfig: params.modelConfig,
    examplePrompts: params.examplePrompts,
  });

  // Fetch and return the created assistant
  const assistant = await getAssistantById(prisma, assistantId);
  if (!assistant) {
    throw new Error("Failed to create assistant");
  }
  return mapAssistantDetail(assistant);
}

/**
 * Update an assistant
 */
export async function updateAssistant(
  assistantId: string,
  teamId: string,
  params: UpdateAssistantParams
): Promise<AssistantDetail | null> {
  const visibilityMap: Record<string, AssistantVisibility> = {
    private: "PRIVATE",
    team: "TEAM",
    public: "PUBLIC",
  };

  const updateData: Record<string, unknown> = {};

  if (params.name !== undefined) {
    updateData.name = params.name;
  }
  if (params.description !== undefined) {
    updateData.description = params.description;
  }
  if (params.systemPrompt !== undefined) {
    updateData.systemPrompt = params.systemPrompt;
  }
  if (params.personality !== undefined) {
    updateData.personality = params.personality;
  }
  if (params.instructions !== undefined) {
    updateData.instructions = params.instructions;
  }
  if (params.connectorIds !== undefined) {
    updateData.connectorIds = params.connectorIds;
  }
  if (params.documentTypes !== undefined) {
    updateData.documentTypes = params.documentTypes;
  }
  if (params.modelConfig !== undefined) {
    updateData.modelConfig = params.modelConfig;
  }
  if (params.examplePrompts !== undefined) {
    updateData.examplePrompts = params.examplePrompts;
  }
  if (params.visibility !== undefined) {
    updateData.visibility = visibilityMap[params.visibility];
  }
  if (params.avatar !== undefined) {
    updateData.avatar = params.avatar;
  }

  const success = await dbUpdateAssistant(
    prisma,
    assistantId,
    teamId,
    updateData
  );

  if (!success) {
    return null;
  }

  return getAssistant(assistantId, teamId);
}

/**
 * Delete an assistant (soft delete)
 */
export async function deleteAssistant(
  assistantId: string,
  teamId: string
): Promise<boolean> {
  return await deactivateAssistant(prisma, assistantId, teamId);
}

/**
 * Increment assistant usage count
 */
export async function incrementUsage(assistantId: string): Promise<void> {
  await incrementAssistantUsage(prisma, assistantId);
}

// ============================================================================
// Private Helpers
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function mapAssistantSummary(
  assistant: AssistantSummaryResult
): AssistantSummary {
  return {
    id: assistant.id,
    name: assistant.name,
    slug: assistant.slug,
    description: assistant.description || undefined,
    avatar: assistant.avatar || undefined,
    visibility: assistant.visibility.toLowerCase() as
      | "private"
      | "team"
      | "public",
    capabilities: assistant.capabilities,
    usageCount: assistant.usageCount,
    createdAt: assistant.createdAt.toISOString(),
  };
}

function mapAssistantDetail(assistant: AssistantResult): AssistantDetail {
  return {
    id: assistant.id,
    name: assistant.name,
    slug: assistant.slug,
    description: assistant.description || undefined,
    avatar: assistant.avatar || undefined,
    visibility: assistant.visibility.toLowerCase() as
      | "private"
      | "team"
      | "public",
    capabilities: assistant.capabilities,
    usageCount: assistant.usageCount,
    createdAt: assistant.createdAt.toISOString(),
    systemPrompt: assistant.systemPrompt,
    personality: assistant.personality || undefined,
    instructions: assistant.instructions || undefined,
    connectorIds: assistant.connectorIds,
    documentTypes: assistant.documentTypes,
    modelConfig: assistant.modelConfig,
    examplePrompts: assistant.examplePrompts,
  };
}

// ============================================================================
// Re-export types
// ============================================================================

export type { AssistantDetail, AssistantSummary } from "../types";
