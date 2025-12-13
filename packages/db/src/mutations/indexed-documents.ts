import type { IndexedDocument } from "../../prisma/generated/client";
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
    },
    create: data,
  });

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
