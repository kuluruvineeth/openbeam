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

export const findDocumentsByConnectorStatus = async (
  db: Database,
  statuses: string[],
  limit = 1000
): Promise<Pick<IndexedDocument, "id" | "vespaId" | "connectorId">[]> => {
  const connectors = await db.connector.findMany({
    where: { status: { in: statuses as never[] } },
    select: { id: true },
  });

  if (connectors.length === 0) {
    return [];
  }

  return db.indexedDocument.findMany({
    where: { connectorId: { in: connectors.map((c) => c.id) } },
    select: { id: true, vespaId: true, connectorId: true },
    take: limit,
  });
};

export const countIndexedDocuments = async (
  db: Database,
  connectorId: string
): Promise<number> => db.indexedDocument.count({ where: { connectorId } });
