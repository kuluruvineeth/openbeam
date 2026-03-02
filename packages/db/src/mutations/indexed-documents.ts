import type { UpsertIndexedDocumentInput } from "@openplane/types/db";
import type { IndexedDocument, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

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
      ...(data.metadata !== undefined && {
        metadata: data.metadata as Prisma.InputJsonValue,
      }),
    },
    create: {
      ...data,
      metadata: data.metadata as Prisma.InputJsonValue,
    },
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
          ...(data.metadata !== undefined && {
            metadata: data.metadata as Prisma.InputJsonValue,
          }),
        },
        create: {
          ...data,
          metadata: data.metadata as Prisma.InputJsonValue,
        },
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

export const deleteIndexedDocumentsByExternalIds = (
  db: Database,
  connectorId: string,
  externalIds: string[]
): Promise<{ count: number }> => {
  if (externalIds.length === 0) {
    return Promise.resolve({ count: 0 });
  }

  return db.indexedDocument.deleteMany({
    where: {
      connectorId,
      externalId: { in: externalIds },
    },
  });
};

export const deleteStaleIndexedDocuments = async (
  db: Database,
  connectorId: string,
  olderThan: Date
): Promise<{ count: number }> =>
  db.indexedDocument.deleteMany({
    where: {
      connectorId,
      lastSyncedAt: { lt: olderThan },
    },
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
