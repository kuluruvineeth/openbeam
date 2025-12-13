import type {
  IndexedMedia,
  ProcessingStatus,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateIndexedMediaInput {
  connectorId: string;
  externalId: string;
  vespaId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileExtension?: string;
  storageKey: string;
  processingStatus?: ProcessingStatus;
  sourceChannelId?: string | null;
  mediaType: "video" | "audio";
}

export const createIndexedMedia = async (
  db: Database,
  data: CreateIndexedMediaInput
): Promise<IndexedMedia> =>
  db.indexedMedia.create({
    data: {
      ...data,
      processingStatus: data.processingStatus ?? "PENDING",
    },
  });

export const updateIndexedMediaStatus = async (
  db: Database,
  id: string,
  status: ProcessingStatus,
  metadata?: {
    lastError?: string;
    errorCount?: { increment: number };
  }
): Promise<IndexedMedia> =>
  db.indexedMedia.update({
    where: { id },
    data: {
      processingStatus: status,
      ...metadata,
    },
  });

export const updateIndexedMediaDownloaded = async (
  db: Database,
  id: string,
  storageKey: string
): Promise<IndexedMedia> =>
  db.indexedMedia.update({
    where: { id },
    data: {
      processingStatus: "DOWNLOADED",
      storageKey,
      uploadedAt: new Date(),
    },
  });

export const updateIndexedMediaTwelveLabs = async (
  db: Database,
  id: string,
  data: { twelveLabsIndexId: string; twelveLabsAssetId: string }
): Promise<IndexedMedia> =>
  db.indexedMedia.update({
    where: { id },
    data: {
      processingStatus: "INDEXED_TWELVELABS",
      twelveLabsIndexId: data.twelveLabsIndexId,
      twelveLabsAssetId: data.twelveLabsAssetId,
    },
  });

export const updateIndexedMediaIndexed = async (
  db: Database,
  id: string,
  data: { vespaId: string; durationSeconds?: number }
): Promise<IndexedMedia> =>
  db.indexedMedia.update({
    where: { id },
    data: {
      processingStatus: "INDEXED",
      vespaId: data.vespaId,
      durationSeconds: data.durationSeconds,
      indexedAt: new Date(),
    },
  });

export const updateIndexedMediaProcessingStatus = async (
  db: Database,
  id: string,
  status: ProcessingStatus,
  extraData?: { durationSeconds?: number }
): Promise<IndexedMedia> =>
  db.indexedMedia.update({
    where: { id },
    data: { processingStatus: status, ...extraData },
  });

export const deleteIndexedMediasByConnector = async (
  db: Database,
  connectorId: string
): Promise<{ count: number }> =>
  db.indexedMedia.deleteMany({ where: { connectorId } });
