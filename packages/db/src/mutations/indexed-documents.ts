import type { IndexedDocument, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface UpsertIndexedDocumentInput {
  connectorId: string;
  externalId: string;
  vespaId: string;
  documentType: string;
  sourceId?: string | null;
  title?: string | null;
  checksum: string;
  lastChecksum?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export const upsertIndexedDocument = async (
  db: Database,
  data: UpsertIndexedDocumentInput
): Promise<IndexedDocument> =>
  db.indexedDocument.upsert({
    where: {
      connectorId_externalId: {
        connectorId: data.connectorId,
        externalId: data.externalId,
      },
    },
    update: {
      title: data.title,
      checksum: data.checksum,
      lastChecksum: data.lastChecksum,
      lastSyncedAt: new Date(),
      ...(data.metadata !== undefined && { metadata: data.metadata }),
    },
    create: data,
  });

export const upsertIndexedDocumentsBatch = async (
  db: Database,
  documents: UpsertIndexedDocumentInput[]
): Promise<number> => {
  if (documents.length === 0) {
    return 0;
  }

  const now = new Date();

  await db.$transaction(
    documents.map((data) =>
      db.indexedDocument.upsert({
        where: {
          connectorId_externalId: {
            connectorId: data.connectorId,
            externalId: data.externalId,
          },
        },
        update: {
          title: data.title,
          checksum: data.checksum,
          lastChecksum: data.lastChecksum,
          lastSyncedAt: now,
          ...(data.metadata !== undefined && { metadata: data.metadata }),
        },
        create: data,
      })
    )
  );

  return documents.length;
};

export const deleteIndexedDocuments = async (
  db: Database,
  ids: string[]
): Promise<{ count: number }> =>
  db.indexedDocument.deleteMany({ where: { id: { in: ids } } });

export const deleteIndexedDocumentsByConnector = async (
  db: Database,
  connectorId: string
): Promise<{ count: number }> =>
  db.indexedDocument.deleteMany({ where: { connectorId } });

export const deleteIndexedDocumentByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<{ count: number }> =>
  db.indexedDocument.deleteMany({
    where: { connectorId, externalId },
  });

export const updateSyncHistoryCounts = async (
  db: Database,
  syncHistoryId: string,
  newCount: number,
  updatedCount: number
): Promise<void> => {
  await db.$executeRawUnsafe(
    `UPDATE sync_history 
     SET "dataAdded" = "dataAdded" + $1, 
         "dataUpdated" = "dataUpdated" + $2
     WHERE _id = $3`,
    newCount,
    updatedCount,
    syncHistoryId
  );
};
