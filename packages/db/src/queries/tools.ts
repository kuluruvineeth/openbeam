/**
 * Tool Queries
 * Query functions for MCP-compatible tools
 */

import type { Tool } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface ListToolsOptions {
  connectorId?: string;
  category?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface ToolWithConnector extends Tool {
  connector: {
    id: string;
    name: string;
    app: string;
    status: string;
  };
}

export interface ToolListResult {
  tools: ToolWithConnector[];
  total: number;
}

export interface ToolCategoryCount {
  category: string;
  count: number;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * List tools for a team with optional filters
 */
export const listToolsByTeam = async (
  db: Database,
  teamId: string,
  options: ListToolsOptions = {}
): Promise<ToolListResult> => {
  const { connectorId, category, enabled, limit = 50, offset = 0 } = options;

  const where = {
    teamId,
    ...(connectorId && { connectorId }),
    ...(category && { category }),
    ...(enabled !== undefined && { enabled }),
  };

  const [tools, total] = await Promise.all([
    db.tool.findMany({
      where,
      include: {
        connector: {
          select: { id: true, name: true, app: true, status: true },
        },
      },
      orderBy: [{ category: "asc" }, { toolName: "asc" }],
      take: limit,
      skip: offset,
    }),
    db.tool.count({ where }),
  ]);

  return {
    tools: tools as ToolWithConnector[],
    total,
  };
};

/**
 * Get tool by ID with team verification
 */
export const getToolById = async (
  db: Database,
  toolId: string,
  teamId: string
): Promise<ToolWithConnector | null> => {
  const tool = await db.tool.findFirst({
    where: { id: toolId, teamId },
    include: {
      connector: {
        select: { id: true, name: true, app: true, status: true },
      },
    },
  });

  return tool as ToolWithConnector | null;
};

/**
 * Check if tool exists by name for a connector
 */
export const toolExistsByName = async (
  db: Database,
  teamId: string,
  connectorId: string,
  toolName: string
): Promise<boolean> => {
  const count = await db.tool.count({
    where: { teamId, connectorId, toolName },
  });
  return count > 0;
};

/**
 * Get tool categories with counts for a team
 */
export const getToolCategories = async (
  db: Database,
  teamId: string
): Promise<ToolCategoryCount[]> => {
  const result = await db.tool.groupBy({
    by: ["category"],
    where: { teamId },
    _count: { category: true },
  });

  return result
    .filter((r) => r.category)
    .map((r) => ({
      category: r.category!,
      count: r._count.category,
    }));
};

/**
 * Get enabled tools for a connector
 */
export const getEnabledToolsByConnector = async (
  db: Database,
  connectorId: string
): Promise<Tool[]> =>
  db.tool.findMany({
    where: { connectorId, enabled: true },
    orderBy: { toolName: "asc" },
  });
