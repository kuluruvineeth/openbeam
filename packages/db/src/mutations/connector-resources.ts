import type { ConnectorResource, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface UpsertConnectorResourceInput {
  connectorId: string;
  externalId: string;
  resourceType: string;
  name?: string;
  path?: string;
  parentId?: string;
  syncEnabled?: boolean;
  syncPriority?: number;
  isPublic?: boolean;
  accessControl?: string[];
  metadata?: Prisma.InputJsonValue;
}

export const upsertConnectorResource = async (
  db: Database,
  data: UpsertConnectorResourceInput
): Promise<ConnectorResource> =>
  db.connectorResource.upsert({
    where: {
      connectorId_externalId: {
        connectorId: data.connectorId,
        externalId: data.externalId,
      },
    },
    create: {
      connectorId: data.connectorId,
      externalId: data.externalId,
      resourceType: data.resourceType,
      name: data.name,
      path: data.path,
      parentId: data.parentId,
      syncEnabled: data.syncEnabled ?? true,
      syncPriority: data.syncPriority ?? 5,
      isPublic: data.isPublic ?? false,
      accessControl: data.accessControl ?? [],
      metadata: data.metadata ?? {},
    },
    update: {
      name: data.name,
      isPublic: data.isPublic,
      metadata: data.metadata,
    },
  });

export const upsertManyConnectorResources = async (
  db: Database,
  resources: UpsertConnectorResourceInput[]
): Promise<void> => {
  await db.$transaction(
    resources.map((resource) =>
      db.connectorResource.upsert({
        where: {
          connectorId_externalId: {
            connectorId: resource.connectorId,
            externalId: resource.externalId,
          },
        },
        create: {
          connectorId: resource.connectorId,
          externalId: resource.externalId,
          resourceType: resource.resourceType,
          name: resource.name,
          path: resource.path,
          parentId: resource.parentId,
          syncEnabled: resource.syncEnabled ?? true,
          syncPriority: resource.syncPriority ?? 5,
          isPublic: resource.isPublic ?? false,
          accessControl: resource.accessControl ?? [],
          metadata: resource.metadata ?? {},
        },
        update: {
          name: resource.name,
          isPublic: resource.isPublic,
          metadata: resource.metadata,
        },
      })
    )
  );
};

export const updateConnectorResourceSync = async (
  db: Database,
  resourceId: string,
  syncEnabled: boolean
): Promise<ConnectorResource> =>
  db.connectorResource.update({
    where: { id: resourceId },
    data: { syncEnabled },
  });

export const updateConnectorResourceDocumentCount = async (
  db: Database,
  connectorId: string,
  externalId: string,
  documentCount: number
): Promise<ConnectorResource> =>
  db.connectorResource.update({
    where: {
      connectorId_externalId: {
        connectorId,
        externalId,
      },
    },
    data: {
      documentCount,
      lastSyncedAt: new Date(),
    },
  });
