import type {
  FileProcessingStatus,
  IndexedFile,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateIndexedFileInput {
  connectorId: string;
  externalId: string;
  vespaId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileExtension?: string;
  storageKey: string;
  processingStatus?: FileProcessingStatus;
  sourceChannelId?: string | null;
}

export const createIndexedFile = async (
  db: Database,
  data: CreateIndexedFileInput
): Promise<IndexedFile> =>
  db.indexedFile.create({
    data: {
      ...data,
      processingStatus: data.processingStatus ?? "PENDING",
    },
  });

export const updateIndexedFileStatus = async (
  db: Database,
  id: string,
  status: FileProcessingStatus,
  metadata?: {
    lastError?: string;
    errorCount?: { increment: number };
  }
): Promise<IndexedFile> =>
  db.indexedFile.update({
    where: { id },
    data: {
      processingStatus: status,
      ...metadata,
    },
  });

export const updateIndexedFileDownloaded = async (
  db: Database,
  id: string,
  storageKey: string
): Promise<IndexedFile> =>
  db.indexedFile.update({
    where: { id },
    data: {
      processingStatus: "DOWNLOADED",
      storageKey,
      uploadedAt: new Date(),
    },
  });

export const updateIndexedFileParsed = async (
  db: Database,
  id: string,
  data: {
    textLength: number;
    pageCount?: number | null;
    chunkCount: number;
  }
): Promise<IndexedFile> =>
  db.indexedFile.update({
    where: { id },
    data: {
      processingStatus: "PARSED",
      extractedText: true,
      textLength: data.textLength,
      pageCount: data.pageCount,
      chunkCount: data.chunkCount,
      processedAt: new Date(),
    },
  });

export const updateIndexedFileIndexed = async (
  db: Database,
  id: string,
  vespaId: string
): Promise<IndexedFile> =>
  db.indexedFile.update({
    where: { id },
    data: {
      processingStatus: "INDEXED",
      vespaId,
      indexedAt: new Date(),
    },
  });

export const updateIndexedFileProcessingStatus = async (
  db: Database,
  id: string,
  status: FileProcessingStatus
): Promise<IndexedFile> =>
  db.indexedFile.update({
    where: { id },
    data: { processingStatus: status },
  });

export const deleteIndexedFilesByConnector = async (
  db: Database,
  connectorId: string
): Promise<{ count: number }> =>
  db.indexedFile.deleteMany({ where: { connectorId } });
