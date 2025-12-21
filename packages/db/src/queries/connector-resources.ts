import type { ConnectorResource, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export type ConnectorResourceWithCount = ConnectorResource & {
  documentCount: number;
};

export type ListConnectorResourcesResult = {
  items: ConnectorResourceWithCount[];
  nextCursor: string | null;
  totalCount: number;
};

type ResourceCountRow = {
  source_id: string;
  count: bigint;
};

async function getResourceDocumentCounts(
  db: Database,
  connectorId: string,
  resourceExternalIds: string[]
): Promise<Map<string, number>> {
  if (resourceExternalIds.length === 0) {
    return new Map();
  }

  // Query uses multiple strategies for resource-document linking:
  // 1. Direct sourceId match (e.g., Slack channels)
  // 2. metadata.resourceExternalIds array (generic multi-resource linking)
  const counts = await db.$queryRaw<ResourceCountRow[]>`
    SELECT source_id, SUM(cnt)::bigint as count FROM (
      SELECT "sourceId" as source_id, COUNT(*)::bigint as cnt
      FROM indexed_document
      WHERE "connectorId" = ${connectorId}
        AND "sourceId" = ANY(${resourceExternalIds})
        AND "deletedFromSource" = false
      GROUP BY "sourceId"

      UNION ALL

      SELECT res_id as source_id, COUNT(*)::bigint as cnt
      FROM indexed_document,
           jsonb_array_elements_text(
             COALESCE(metadata->'resourceExternalIds', '[]'::jsonb)
           ) AS res_id
      WHERE "connectorId" = ${connectorId}
        AND res_id = ANY(${resourceExternalIds})
        AND "deletedFromSource" = false
      GROUP BY res_id

      UNION ALL

      SELECT "sourceChannelId" as source_id, COUNT(*)::bigint as cnt
      FROM indexed_file
      WHERE "connectorId" = ${connectorId}
        AND "sourceChannelId" = ANY(${resourceExternalIds})
        AND "processingStatus" = 'INDEXED'
      GROUP BY "sourceChannelId"

      UNION ALL

      SELECT "sourceChannelId" as source_id, COUNT(*)::bigint as cnt
      FROM indexed_media
      WHERE "connectorId" = ${connectorId}
        AND "sourceChannelId" = ANY(${resourceExternalIds})
        AND "processingStatus" = 'INDEXED'
      GROUP BY "sourceChannelId"
    ) combined
    GROUP BY source_id
  `;

  const countMap = new Map<string, number>();
  for (const row of counts) {
    if (row.source_id) {
      countMap.set(row.source_id, Number(row.count));
    }
  }
  return countMap;
}

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

  const where: Prisma.ConnectorResourceWhereInput = {
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

  const resourceExternalIds = items.map((r) => r.externalId);
  const countMap = await getResourceDocumentCounts(
    db,
    connectorId,
    resourceExternalIds
  );

  const itemsWithCounts: ConnectorResourceWithCount[] = items.map((r) => ({
    ...r,
    documentCount: countMap.get(r.externalId) ?? 0,
  }));

  return {
    items: itemsWithCounts,
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
  source: "document" | "file" | "media";
};

export type ListResourceDocumentsResult = {
  items: ResourceDocument[];
  nextCursor: string | null;
  totalCount: number;
};

type ResourceDocumentRow = {
  id: string;
  title: string | null;
  document_type: string;
  indexed_at: Date;
  source: string;
};

type CountRow = { count: bigint };

export const listResourceDocuments = async (
  db: Database,
  connectorId: string,
  resourceExternalId: string,
  options: { search?: string; cursor?: string; limit: number }
): Promise<ListResourceDocumentsResult> => {
  const { search, cursor, limit } = options;
  const searchPattern = search ? `%${search}%` : null;

  let cursorTimestamp: Date | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const separatorIndex = cursor.indexOf("_");
    if (separatorIndex > 0) {
      cursorTimestamp = new Date(cursor.slice(0, separatorIndex));
      cursorId = cursor.slice(separatorIndex + 1);
    }
  }

  // Query uses multiple strategies for resource-document linking:
  // 1. Direct sourceId match (e.g., Slack channels)
  // 2. metadata.resourceExternalIds array (generic multi-resource linking)
  // NOTE: Returns vespaId as id since that's what Vespa uses for document lookups
  const documents = await db.$queryRaw<ResourceDocumentRow[]>`
    SELECT * FROM (
      SELECT
        "vespaId" as id,
        title,
        "documentType" as document_type,
        "indexedAt" as indexed_at,
        'document' as source
      FROM indexed_document
      WHERE "connectorId" = ${connectorId}
        AND (
          "sourceId" = ${resourceExternalId}
          OR metadata->'resourceExternalIds' @> to_jsonb(${resourceExternalId}::text)
        )
        AND "deletedFromSource" = false
        AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern})

      UNION ALL

      SELECT
        "vespaId" as id,
        "fileName" as title,
        SPLIT_PART("mimeType", '/', 1) as document_type,
        COALESCE("indexedAt", "createdAt") as indexed_at,
        'file' as source
      FROM indexed_file
      WHERE "connectorId" = ${connectorId}
        AND "sourceChannelId" = ${resourceExternalId}
        AND "processingStatus" = 'INDEXED'
        AND (${searchPattern}::text IS NULL OR "fileName" ILIKE ${searchPattern})

      UNION ALL

      SELECT
        "vespaId" as id,
        "fileName" as title,
        "mediaType" as document_type,
        COALESCE("indexedAt", "createdAt") as indexed_at,
        'media' as source
      FROM indexed_media
      WHERE "connectorId" = ${connectorId}
        AND "sourceChannelId" = ${resourceExternalId}
        AND "processingStatus" = 'INDEXED'
        AND (${searchPattern}::text IS NULL OR "fileName" ILIKE ${searchPattern})
    ) combined
    WHERE (
      ${cursorTimestamp}::timestamptz IS NULL
      OR indexed_at < ${cursorTimestamp}
      OR (indexed_at = ${cursorTimestamp} AND ${cursorId}::text IS NOT NULL AND id < ${cursorId})
    )
    ORDER BY indexed_at DESC, id DESC
    LIMIT ${limit + 1}
  `;

  const [countResult] = await db.$queryRaw<CountRow[]>`
    SELECT (
      (SELECT COUNT(*) FROM indexed_document
       WHERE "connectorId" = ${connectorId}
         AND (
           "sourceId" = ${resourceExternalId}
           OR metadata->'resourceExternalIds' @> to_jsonb(${resourceExternalId}::text)
         )
         AND "deletedFromSource" = false
         AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern}))
      +
      (SELECT COUNT(*) FROM indexed_file
       WHERE "connectorId" = ${connectorId}
         AND "sourceChannelId" = ${resourceExternalId}
         AND "processingStatus" = 'INDEXED'
         AND (${searchPattern}::text IS NULL OR "fileName" ILIKE ${searchPattern}))
      +
      (SELECT COUNT(*) FROM indexed_media
       WHERE "connectorId" = ${connectorId}
         AND "sourceChannelId" = ${resourceExternalId}
         AND "processingStatus" = 'INDEXED'
         AND (${searchPattern}::text IS NULL OR "fileName" ILIKE ${searchPattern}))
    )::bigint as count
  `;

  const totalCount = Number(countResult?.count ?? 0);
  const hasMore = documents.length > limit;

  const items: ResourceDocument[] = documents.slice(0, limit).map((row) => ({
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    indexedAt: new Date(row.indexed_at),
    source: row.source as "document" | "file" | "media",
  }));

  const lastItem = items.at(-1);
  const nextCursor =
    hasMore && lastItem
      ? `${lastItem.indexedAt.toISOString()}_${lastItem.id}`
      : null;

  return {
    items,
    nextCursor,
    totalCount,
  };
};
