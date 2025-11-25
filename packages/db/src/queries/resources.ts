/**
 * Connector Resource Queries
 * Query functions for connector resources (channels, folders, repos)
 */

import type { ConnectorResource } from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface ListResourcesOptions {
  resourceType?: string;
  syncEnabled?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ResourceListResult {
  resources: ConnectorResource[];
  total: number;
}

export interface ResourceTypeCount {
  type: string;
  count: number;
}

export interface ResourceSyncStats {
  total: number;
  enabled: number;
  disabled: number;
  totalDocuments: number;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * List resources for a connector
 */
export const listResourcesByConnector = async (
  db: Database,
  connectorId: string,
  options: ListResourcesOptions = {}
): Promise<ResourceListResult> => {
  const { resourceType, syncEnabled, search, limit = 50, offset = 0 } = options;

  const where = {
    connectorId,
    ...(resourceType && { resourceType }),
    ...(syncEnabled !== undefined && { syncEnabled }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { path: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [resources, total] = await Promise.all([
    db.connectorResource.findMany({
      where,
      orderBy: [{ resourceType: "asc" }, { name: "asc" }],
      take: limit,
      skip: offset,
    }),
    db.connectorResource.count({ where }),
  ]);

  return { resources, total };
};

/**
 * Get resource by ID with team verification
 */
export const getResourceById = async (
  db: Database,
  resourceId: string,
  teamId: string
): Promise<ConnectorResource | null> => {
  const resource = await db.connectorResource.findUnique({
    where: { id: resourceId },
    include: {
      connector: { select: { teamId: true } },
    },
  });

  if (!resource || resource.connector.teamId !== teamId) {
    return null;
  }

  const { connector: _, ...rest } = resource;
  return rest;
};

/**
 * Get resource types with counts for a connector
 */
export const getResourceTypes = async (
  db: Database,
  connectorId: string
): Promise<ResourceTypeCount[]> => {
  const result = await db.connectorResource.groupBy({
    by: ["resourceType"],
    where: { connectorId },
    _count: { resourceType: true },
  });

  return result.map((r) => ({
    type: r.resourceType,
    count: r._count.resourceType,
  }));
};

/**
 * Get sync stats for resources
 */
export const getResourceSyncStats = async (
  db: Database,
  connectorId: string
): Promise<ResourceSyncStats> => {
  const [total, enabled, disabled, totalDocs] = await Promise.all([
    db.connectorResource.count({ where: { connectorId } }),
    db.connectorResource.count({ where: { connectorId, syncEnabled: true } }),
    db.connectorResource.count({ where: { connectorId, syncEnabled: false } }),
    db.connectorResource.aggregate({
      where: { connectorId, syncEnabled: true },
      _sum: { documentCount: true },
    }),
  ]);

  return {
    total,
    enabled,
    disabled,
    totalDocuments: totalDocs._sum.documentCount ?? 0,
  };
};

/**
 * Find resource by external ID
 */
export const findResourceByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<ConnectorResource | null> =>
  db.connectorResource.findUnique({
    where: {
      connectorId_externalId: { connectorId, externalId },
    },
  });

/**
 * Verify resources belong to team's connector
 */
export const verifyResourcesTeamAccess = async (
  db: Database,
  resourceIds: string[],
  teamId: string
): Promise<string[]> => {
  const resources = await db.connectorResource.findMany({
    where: { id: { in: resourceIds } },
    include: { connector: { select: { teamId: true } } },
  });

  return resources
    .filter((r) => r.connector.teamId === teamId)
    .map((r) => r.id);
};
