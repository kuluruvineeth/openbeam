/**
 * Tool Mutations
 * Mutation functions for MCP-compatible tools
 */

import type { Prisma, Tool } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface CreateToolInput {
  teamId: string;
  connectorId: string;
  toolName: string;
  displayName?: string;
  description?: string;
  category?: string;
  toolSchema: Prisma.InputJsonValue;
  outputSchema?: Prisma.InputJsonValue;
  config?: Prisma.InputJsonValue;
  requiredPermissions?: string[];
  enabled?: boolean;
}

export interface UpdateToolInput {
  displayName?: string;
  description?: string;
  category?: string;
  toolSchema?: Prisma.InputJsonValue;
  outputSchema?: Prisma.InputJsonValue | null;
  config?: Prisma.InputJsonValue;
  requiredPermissions?: string[];
  enabled?: boolean;
  rateLimitPerMinute?: number | null;
  rateLimitPerHour?: number | null;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new tool
 */
export const createTool = async (
  db: Database,
  data: CreateToolInput
): Promise<Tool> =>
  db.tool.create({
    data: {
      teamId: data.teamId,
      connectorId: data.connectorId,
      toolName: data.toolName,
      displayName: data.displayName,
      description: data.description,
      category: data.category,
      toolSchema: data.toolSchema,
      outputSchema: data.outputSchema,
      config: data.config ?? {},
      requiredPermissions: data.requiredPermissions ?? [],
      enabled: data.enabled ?? false,
    },
  });

/**
 * Update a tool
 */
export const updateTool = async (
  db: Database,
  toolId: string,
  data: UpdateToolInput
): Promise<Tool> =>
  db.tool.update({
    where: { id: toolId },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.toolSchema && { toolSchema: data.toolSchema }),
      ...(data.outputSchema !== undefined && {
        outputSchema: data.outputSchema,
      }),
      ...(data.config && { config: data.config }),
      ...(data.requiredPermissions && {
        requiredPermissions: data.requiredPermissions,
      }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.rateLimitPerMinute !== undefined && {
        rateLimitPerMinute: data.rateLimitPerMinute,
      }),
      ...(data.rateLimitPerHour !== undefined && {
        rateLimitPerHour: data.rateLimitPerHour,
      }),
    },
  });

/**
 * Delete a tool
 */
export const deleteTool = async (db: Database, toolId: string): Promise<Tool> =>
  db.tool.delete({
    where: { id: toolId },
  });

/**
 * Toggle tool enabled status
 */
export const toggleToolEnabled = async (
  db: Database,
  toolId: string,
  currentEnabled: boolean
): Promise<Tool> =>
  db.tool.update({
    where: { id: toolId },
    data: { enabled: !currentEnabled },
  });

/**
 * Track tool usage (increment count and update timestamp)
 */
export const trackToolUsage = async (
  db: Database,
  toolId: string,
  latencyMs?: number
): Promise<void> => {
  await db.tool.update({
    where: { id: toolId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
      ...(latencyMs !== undefined && {
        avgLatencyMs: latencyMs, // TODO: Calculate moving average
      }),
    },
  });
};
