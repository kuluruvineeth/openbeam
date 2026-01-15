import type {
  DocumentListResult,
  DocumentQueryParams,
  DocumentsByTypeCount,
} from "@openplane/types/db";
import type { IndexedDocument } from "../../prisma/generated/client";
import type { Database } from "../index";

export const findIndexedDocumentsByConnector = async (
  db: Database,
  connectorId: string,
  options?: { take?: number; skip?: number }
): Promise<IndexedDocument[]> =>
  db.indexedDocument.findMany({
    where: { connectorId },
    take: options?.take,
    skip: options?.skip,
    orderBy: { lastSyncedAt: "desc" },
  });

export const findIndexedDocumentByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<IndexedDocument | null> =>
  db.indexedDocument.findUnique({
    where: { connectorId_externalId: { connectorId, externalId } },
  });

export const findIndexedDocumentsByExternalIds = async (
  db: Database,
  connectorId: string,
  externalIds: string[]
): Promise<Map<string, { checksum: string; lastChecksum: string | null }>> => {
  const docs = await db.indexedDocument.findMany({
    where: { connectorId, externalId: { in: externalIds } },
    select: { externalId: true, checksum: true, lastChecksum: true },
  });

  return new Map(
    docs.map((d) => [
      d.externalId,
      { checksum: d.checksum || "", lastChecksum: d.lastChecksum },
    ])
  );
};

export const findStaleDocuments = async (
  db: Database,
  cutoffDate: Date,
  limit = 1000
): Promise<Pick<IndexedDocument, "id" | "vespaId" | "connectorId">[]> =>
  db.indexedDocument.findMany({
    where: { lastSyncedAt: { lt: cutoffDate } },
    select: { id: true, vespaId: true, connectorId: true },
    take: limit,
  });

export const findOrphanedDocuments = async (
  db: Database,
  limit = 1000
): Promise<Array<{ id: string; vespaId: string; connectorId: string }>> =>
  db.$queryRaw<Array<{ id: string; vespaId: string; connectorId: string }>>`
    SELECT id._id as id, id."vespaId", id."connectorId"
    FROM "indexed_document" id
    LEFT JOIN "connector" c ON id."connectorId" = c._id
    WHERE c._id IS NULL
    LIMIT ${limit}
  `;

export const findConnectorsByStatus = async (
  db: Database,
  statuses: string[]
): Promise<Array<{ id: string; status: string }>> =>
  db.connector.findMany({
    where: { status: { in: statuses as never[] } },
    select: { id: true, status: true },
  });

export const findDocumentsForCleanup = async (
  db: Database,
  connectorId: string,
  limit = 1000
): Promise<Pick<IndexedDocument, "id" | "vespaId">[]> =>
  db.indexedDocument.findMany({
    where: { connectorId },
    select: { id: true, vespaId: true },
    take: limit,
  });

export const countIndexedDocuments = async (
  db: Database,
  connectorId: string
): Promise<number> => db.indexedDocument.count({ where: { connectorId } });

export const queryDocuments = async (
  db: Database,
  params: DocumentQueryParams
): Promise<DocumentListResult> => {
  const limit = Math.min(params.limit ?? 20, 100);
  const orderBy = params.orderBy ?? "lastSyncedAt";
  const order = params.order ?? "desc";

  const connectorIds = await db.connector.findMany({
    where: {
      teamId: params.teamId,
      ...(params.connectorId && { id: params.connectorId }),
    },
    select: { id: true },
  });

  if (connectorIds.length === 0) {
    return { documents: [], nextCursor: null, hasMore: false, total: 0 };
  }

  const connectorIdList = connectorIds.map((c) => c.id);

  const whereClause = {
    connectorId: { in: connectorIdList },
    ...(params.documentType && { documentType: params.documentType }),
  };

  const [documents, total] = await Promise.all([
    db.indexedDocument.findMany({
      where: whereClause,
      orderBy: { [orderBy]: order },
      take: limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      select: {
        id: true,
        vespaId: true,
        externalId: true,
        documentType: true,
        documentSubtype: true,
        connectorId: true,
        indexedAt: true,
        lastSyncedAt: true,
      },
    }),
    db.indexedDocument.count({ where: whereClause }),
  ]);

  const hasMore = documents.length > limit;
  const results = hasMore ? documents.slice(0, -1) : documents;
  const lastDoc = results.at(-1);

  return {
    documents: results,
    nextCursor: hasMore && lastDoc ? lastDoc.id : null,
    hasMore,
    total,
  };
};

export const countDocumentsByType = async (
  db: Database,
  connectorId: string
): Promise<DocumentsByTypeCount[]> => {
  const counts = await db.indexedDocument.groupBy({
    by: ["documentType"],
    where: { connectorId },
    _count: { id: true },
  });

  return counts.map((c) => ({
    documentType: c.documentType,
    count: c._count.id,
  }));
};
