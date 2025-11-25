/**
 * External Group Queries
 * Query functions for external groups synced from connectors
 */

import type { ExternalGroup } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface ListGroupsOptions {
  groupType?: string;
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface GroupListResult {
  groups: ExternalGroup[];
  total: number;
}

export interface GroupTypeCount {
  type: string;
  count: number;
}

export interface GroupStats {
  total: number;
  active: number;
  inactive: number;
  totalMembers: number;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * List external groups for a connector
 */
export const listGroupsByConnector = async (
  db: Database,
  connectorId: string,
  options: ListGroupsOptions = {}
): Promise<GroupListResult> => {
  const { groupType, search, isActive, limit = 50, offset = 0 } = options;

  const where = {
    connectorId,
    ...(groupType && { groupType }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [groups, total] = await Promise.all([
    db.externalGroup.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    }),
    db.externalGroup.count({ where }),
  ]);

  return { groups, total };
};

/**
 * Get group by ID with team verification
 */
export const getGroupById = async (
  db: Database,
  groupId: string,
  teamId: string
): Promise<ExternalGroup | null> => {
  const group = await db.externalGroup.findUnique({
    where: { id: groupId },
    include: {
      connector: { select: { teamId: true } },
    },
  });

  if (!group || group.connector.teamId !== teamId) {
    return null;
  }

  const { connector: _, ...rest } = group;
  return rest;
};

/**
 * Get group types with counts for a connector
 */
export const getGroupTypes = async (
  db: Database,
  connectorId: string
): Promise<GroupTypeCount[]> => {
  const result = await db.externalGroup.groupBy({
    by: ["groupType"],
    where: { connectorId },
    _count: { groupType: true },
  });

  return result
    .filter((r) => r.groupType)
    .map((r) => ({
      type: r.groupType!,
      count: r._count.groupType,
    }));
};

/**
 * Get group stats for a connector
 */
export const getGroupStats = async (
  db: Database,
  connectorId: string
): Promise<GroupStats> => {
  const [total, active, totalMembers] = await Promise.all([
    db.externalGroup.count({ where: { connectorId } }),
    db.externalGroup.count({ where: { connectorId, isActive: true } }),
    db.externalGroup.aggregate({
      where: { connectorId },
      _sum: { memberCount: true },
    }),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    totalMembers: totalMembers._sum.memberCount ?? 0,
  };
};

/**
 * Find group by external ID
 */
export const findGroupByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<ExternalGroup | null> =>
  db.externalGroup.findUnique({
    where: {
      connectorId_externalId: { connectorId, externalId },
    },
  });
