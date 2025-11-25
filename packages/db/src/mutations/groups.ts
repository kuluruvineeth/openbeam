/**
 * External Group Mutations
 * Mutation functions for external groups synced from connectors
 */

import type { ExternalGroup, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface UpsertGroupInput {
  connectorId: string;
  externalId: string;
  name: string;
  description?: string;
  groupType?: string;
  parentId?: string;
  memberCount?: number;
  memberIds?: string[];
  isActive?: boolean;
  metadata?: Prisma.InputJsonValue;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Upsert external group
 */
export const upsertGroup = async (
  db: Database,
  data: UpsertGroupInput
): Promise<ExternalGroup> => {
  const { connectorId, externalId, ...rest } = data;

  return db.externalGroup.upsert({
    where: {
      connectorId_externalId: { connectorId, externalId },
    },
    create: {
      connectorId,
      externalId,
      ...rest,
    },
    update: rest,
  });
};

/**
 * Bulk upsert groups
 */
export const bulkUpsertGroups = async (
  db: Database,
  groups: UpsertGroupInput[]
): Promise<number> => {
  let count = 0;

  await db.$transaction(async (tx) => {
    for (const group of groups) {
      await tx.externalGroup.upsert({
        where: {
          connectorId_externalId: {
            connectorId: group.connectorId,
            externalId: group.externalId,
          },
        },
        create: group,
        update: group,
      });
      count++;
    }
  });

  return count;
};

/**
 * Update group member count
 */
export const updateGroupMemberCount = async (
  db: Database,
  groupId: string,
  memberCount: number,
  memberIds?: string[]
): Promise<ExternalGroup> =>
  db.externalGroup.update({
    where: { id: groupId },
    data: {
      memberCount,
      ...(memberIds && { memberIds }),
    },
  });

/**
 * Mark groups as inactive
 */
export const markGroupsInactive = async (
  db: Database,
  connectorId: string,
  externalIds: string[]
): Promise<number> => {
  const result = await db.externalGroup.updateMany({
    where: {
      connectorId,
      externalId: { in: externalIds },
    },
    data: { isActive: false },
  });

  return result.count;
};
