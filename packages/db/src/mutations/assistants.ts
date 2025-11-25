import type { Database } from "../index";
import type { AssistantVisibility } from "../queries/assistants";

// === Assistant Mutation Types ===

export interface CreateAssistantInput {
  teamId: string;
  createdBy: string;
  name: string;
  slug: string;
  description?: string | null;
  avatar?: string | null;
  systemPrompt: string;
  personality?: string | null;
  instructions?: string | null;
  visibility?: AssistantVisibility;
  capabilities?: string[];
  connectorIds?: string[];
  documentTypes?: string[];
  modelConfig?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  examplePrompts?: string[];
}

export interface UpdateAssistantInput {
  name?: string;
  description?: string | null;
  avatar?: string | null;
  systemPrompt?: string;
  personality?: string | null;
  instructions?: string | null;
  visibility?: AssistantVisibility;
  capabilities?: string[];
  connectorIds?: string[];
  documentTypes?: string[];
  modelConfig?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  examplePrompts?: string[];
}

// === Assistant Mutations ===

/**
 * Create a new assistant
 */
export const createAssistant = async (
  db: Database,
  input: CreateAssistantInput
): Promise<string> => {
  const assistant = await db.assistant.create({
    data: {
      teamId: input.teamId,
      createdBy: input.createdBy,
      name: input.name,
      slug: input.slug,
      description: input.description,
      avatar: input.avatar,
      systemPrompt: input.systemPrompt,
      personality: input.personality,
      instructions: input.instructions,
      visibility: input.visibility || "PRIVATE",
      capabilities: input.capabilities || [],
      connectorIds: input.connectorIds || [],
      documentTypes: input.documentTypes || [],
      modelConfig: input.modelConfig || {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 4096,
      },
      examplePrompts: input.examplePrompts || [],
      isActive: true,
    },
  });

  return assistant.id;
};

/**
 * Update an assistant
 */
export const updateAssistant = async (
  db: Database,
  assistantId: string,
  teamId: string,
  input: UpdateAssistantInput
): Promise<boolean> => {
  const result = await db.assistant.updateMany({
    where: {
      id: assistantId,
      teamId,
    },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Update assistant as owner only
 */
export const updateAssistantAsOwner = async (
  db: Database,
  assistantId: string,
  createdBy: string,
  input: UpdateAssistantInput
): Promise<boolean> => {
  const result = await db.assistant.updateMany({
    where: {
      id: assistantId,
      createdBy,
    },
    data: {
      ...input,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Soft delete an assistant
 */
export const deactivateAssistant = async (
  db: Database,
  assistantId: string,
  teamId: string
): Promise<boolean> => {
  const result = await db.assistant.updateMany({
    where: {
      id: assistantId,
      teamId,
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Soft delete an assistant as owner
 */
export const deactivateAssistantAsOwner = async (
  db: Database,
  assistantId: string,
  createdBy: string
): Promise<boolean> => {
  const result = await db.assistant.updateMany({
    where: {
      id: assistantId,
      createdBy,
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Reactivate an assistant
 */
export const reactivateAssistant = async (
  db: Database,
  assistantId: string,
  teamId: string
): Promise<boolean> => {
  const result = await db.assistant.updateMany({
    where: {
      id: assistantId,
      teamId,
    },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Increment assistant usage count
 */
export const incrementAssistantUsage = async (
  db: Database,
  assistantId: string
): Promise<void> => {
  await db.assistant.update({
    where: { id: assistantId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Hard delete an assistant
 */
export const deleteAssistant = async (
  db: Database,
  assistantId: string,
  teamId: string
): Promise<boolean> => {
  const result = await db.assistant.deleteMany({
    where: {
      id: assistantId,
      teamId,
    },
  });

  return result.count > 0;
};
