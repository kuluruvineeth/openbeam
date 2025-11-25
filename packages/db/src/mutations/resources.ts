/**
 * Connector Resource Mutations
 * Mutation functions for connector resources
 */

import type { ConnectorResource, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface UpsertResourceInput {
  connectorId: string;
  externalId: string;
  resourceType: string;
  name: string;
  path?: string;
  parentId?: string;
  syncEnabled?: boolean;
  syncPriority?: number;
  isPublic?: boolean;
  accessControl?: string[];
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateResourceInput {
  syncEnabled?: boolean;
  syncPriority?: number;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update resource sync settings
 */
export const updateResource = async (
  db: Database,
  resourceId: string,
  data: UpdateResourceInput
): Promise<ConnectorResource> =>
  db.connectorResource.update({
    where: { id: resourceId },
    data,
  });

/**
 * Bulk update resource sync settings
 */
export const bulkUpdateResources = async (
  db: Database,
  resourceIds: string[],
  data: UpdateResourceInput
): Promise<number> => {
  const result = await db.connectorResource.updateMany({
    where: { id: { in: resourceIds } },
    data,
  });

  return result.count;
};

/**
 * Upsert connector resource
 */
export const upsertResource = async (
  db: Database,
  data: UpsertResourceInput
): Promise<ConnectorResource> => {
  const { connectorId, externalId, ...rest } = data;

  return db.connectorResource.upsert({
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
 * Bulk upsert resources
 */
export const bulkUpsertResources = async (
  db: Database,
  resources: UpsertResourceInput[]
): Promise<number> => {
  let count = 0;

  await db.$transaction(async (tx) => {
    for (const resource of resources) {
      await tx.connectorResource.upsert({
        where: {
          connectorId_externalId: {
            connectorId: resource.connectorId,
            externalId: resource.externalId,
          },
        },
        create: resource,
        update: resource,
      });
      count++;
    }
  });

  return count;
};

/**
 * Update resource document count
 */
export const updateResourceDocumentCount = async (
  db: Database,
  resourceId: string,
  documentCount: number
): Promise<ConnectorResource> =>
  db.connectorResource.update({
    where: { id: resourceId },
    data: {
      documentCount,
      lastSyncedAt: new Date(),
    },
  });

/**
 * Increment resource document count
 */
export const incrementResourceDocumentCount = async (
  db: Database,
  resourceId: string,
  increment = 1
): Promise<ConnectorResource> =>
  db.connectorResource.update({
    where: { id: resourceId },
    data: {
      documentCount: { increment },
    },
  });
