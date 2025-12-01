import type { ConnectorResource } from "../../prisma/generated/client";
import type { Database } from "../index";

export const listConnectorResources = async (
  db: Database,
  connectorId: string
): Promise<ConnectorResource[]> =>
  db.connectorResource.findMany({
    where: { connectorId },
    orderBy: [{ syncEnabled: "desc" }, { name: "asc" }],
  });

export const listEnabledConnectorResources = async (
  db: Database,
  connectorId: string,
  resourceType?: string
): Promise<ConnectorResource[]> =>
  db.connectorResource.findMany({
    where: {
      connectorId,
      syncEnabled: true,
      ...(resourceType && { resourceType: { contains: resourceType } }),
    },
    select: {
      id: true,
      connectorId: true,
      externalId: true,
      resourceType: true,
      name: true,
      path: true,
      parentId: true,
      syncEnabled: true,
      syncPriority: true,
      lastSyncedAt: true,
      documentCount: true,
      isPublic: true,
      accessControl: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });

export const getEnabledResourceExternalIds = async (
  db: Database,
  connectorId: string,
  resourceType?: string
): Promise<Set<string>> => {
  const resources = await db.connectorResource.findMany({
    where: {
      connectorId,
      syncEnabled: true,
      ...(resourceType && { resourceType: { contains: resourceType } }),
    },
    select: { externalId: true },
  });
  return new Set(resources.map((r) => r.externalId));
};

export const getDisabledResourceExternalIds = async (
  db: Database,
  connectorId: string,
  resourceType?: string
): Promise<Set<string>> => {
  const resources = await db.connectorResource.findMany({
    where: {
      connectorId,
      syncEnabled: false,
      ...(resourceType && { resourceType: { contains: resourceType } }),
    },
    select: { externalId: true },
  });
  return new Set(resources.map((r) => r.externalId));
};

export const getConnectorResourceById = async (
  db: Database,
  resourceId: string
): Promise<ConnectorResource | null> =>
  db.connectorResource.findUnique({
    where: { id: resourceId },
  });

export const getConnectorResourceByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<ConnectorResource | null> =>
  db.connectorResource.findUnique({
    where: {
      connectorId_externalId: {
        connectorId,
        externalId,
      },
    },
  });
