import type { ConnectorResource } from "../../prisma/generated/client";
import type { Database } from "../index";

export type ListConnectorResourcesResult = {
  items: ConnectorResource[];
  nextCursor: string | null;
  totalCount: number;
};

export const listConnectorResources = async (
  db: Database,
  connectorId: string,
  options?: {
    search?: string;
    cursor?: string;
    limit?: number;
  }
): Promise<ListConnectorResourcesResult> => {
  const { search, cursor, limit = 50 } = options ?? {};

  const where = {
    connectorId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { resourceType: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [resources, totalCount] = await Promise.all([
    db.connectorResource.findMany({
      where,
      orderBy: [{ syncEnabled: "desc" }, { name: "asc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    db.connectorResource.count({ where }),
  ]);

  const hasMore = resources.length > limit;
  const items = resources.slice(0, limit);

  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    totalCount,
  };
};

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

export type ResourceDocument = {
  id: string;
  title: string | null;
  documentType: string;
  indexedAt: Date;
  source: "document" | "file" | "video";
};

export type ListResourceDocumentsResult = {
  items: ResourceDocument[];
  nextCursor: string | null;
  totalCount: number;
};

export const listResourceDocuments = async (
  db: Database,
  connectorId: string,
  resourceExternalId: string,
  options: { search?: string; cursor?: string; limit: number }
): Promise<ListResourceDocumentsResult> => {
  const { search, cursor, limit } = options;

  const documentWhere = {
    connectorId,
    sourceId: resourceExternalId,
    deletedFromSource: false,
    ...(search && {
      title: { contains: search, mode: "insensitive" as const },
    }),
  };

  const fileWhere = {
    connectorId,
    ...(search && {
      fileName: { contains: search, mode: "insensitive" as const },
    }),
  };

  const videoWhere = {
    connectorId,
    sourceChannelId: resourceExternalId,
    processingStatus: "INDEXED" as const,
    ...(search && {
      fileName: { contains: search, mode: "insensitive" as const },
    }),
  };

  //TODO: right now we are returning all resources, later strictly change to return resources with matching resourceExternalId

  const [documents, files, videos, docCount, fileCount, videoCount] =
    await Promise.all([
      db.indexedDocument.findMany({
        where: documentWhere,
        select: {
          id: true,
          title: true,
          documentType: true,
          indexedAt: true,
        },
        orderBy: { indexedAt: "desc" },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      db.indexedFile.findMany({
        where: fileWhere,
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          indexedAt: true,
        },
        orderBy: { indexedAt: "desc" },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      db.indexedVideo.findMany({
        where: videoWhere,
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          indexedAt: true,
        },
        orderBy: { indexedAt: "desc" },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      db.indexedDocument.count({ where: documentWhere }),
      db.indexedFile.count({ where: fileWhere }),
      db.indexedVideo.count({ where: videoWhere }),
    ]);

  const combined: ResourceDocument[] = [
    ...documents.map((d) => ({
      id: d.id,
      title: d.title,
      documentType: d.documentType,
      indexedAt: d.indexedAt,
      source: "document" as const,
    })),
    ...files.map((f) => ({
      id: f.id,
      title: f.fileName,
      documentType: f.mimeType.split("/")[0] ?? "file",
      indexedAt: f.indexedAt ?? new Date(),
      source: "file" as const,
    })),
    ...videos.map((v) => ({
      id: v.id,
      title: v.fileName,
      documentType: "video",
      indexedAt: v.indexedAt ?? new Date(),
      source: "video" as const,
    })),
  ]
    .sort((a, b) => b.indexedAt.getTime() - a.indexedAt.getTime())
    .slice(0, limit + 1);

  const hasMore = combined.length > limit;
  const items = combined.slice(0, limit);

  return {
    items,
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    totalCount: docCount + fileCount + videoCount,
  };
};
