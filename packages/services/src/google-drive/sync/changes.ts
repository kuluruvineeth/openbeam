import {
  type DriveChange,
  type DriveFile,
  type DriveMediaInfo,
  GOOGLE_WORKSPACE_MIME_TYPES,
  type GoogleDriveSyncBatch,
  type GoogleDriveSyncCursor,
  type GoogleDriveTransformContext,
} from "@openbeam/types/services/connectors/google-drive";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { fetchChanges, partitionChanges } from "../api/changes";
import type { GoogleDriveClient } from "../client";
import { transformFile } from "../transformers/file";
import { extractFileContent } from "../utils/content-extractor";
import { isMediaType, isTextExtractable } from "../utils/mime-types";

const MAX_CHANGES_LIMIT = 10_000;

async function collectAllChanges(
  client: GoogleDriveClient,
  startPageToken: string,
  includeRemoved: boolean
): Promise<{ changes: DriveChange[]; newToken?: string; truncated: boolean }> {
  const changes: DriveChange[] = [];
  const generator = fetchChanges(client, {
    pageToken: startPageToken,
    includeRemoved,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  let result = await generator.next();
  let truncated = false;

  while (!result.done) {
    changes.push(result.value);
    if (changes.length >= MAX_CHANGES_LIMIT) {
      logger.warn(
        { changeCount: changes.length, limit: MAX_CHANGES_LIMIT },
        "Google Drive changes limit reached, truncating to prevent memory issues"
      );
      truncated = true;
      break;
    }
    result = await generator.next();
  }

  const newToken = result.done ? result.value?.newStartPageToken : undefined;
  return { changes, newToken, truncated };
}

async function processFile(
  client: GoogleDriveClient,
  file: DriveFile,
  context: GoogleDriveTransformContext,
  extractContent: boolean
): Promise<GenericDocument> {
  let content: string | undefined;
  if (extractContent && isTextExtractable(file.mimeType)) {
    const extracted = await extractFileContent(client, file);
    content = extracted.text;
  }
  return await transformFile(file, context, { content });
}

async function handleRemovedFiles(
  removed: DriveChange[],
  connectorId: string,
  onDocumentsRemoved?: (documentIds: string[]) => Promise<void>
): Promise<void> {
  if (!onDocumentsRemoved || removed.length === 0) {
    return;
  }
  const removedIds = removed.flatMap((c) =>
    c.fileId ? [buildFileDocumentId(connectorId, c.fileId)] : []
  );
  if (removedIds.length > 0) {
    await onDocumentsRemoved(removedIds);
  }
}

async function handleMediaDiscovery(
  file: DriveFile,
  indexMedia: boolean,
  onMediaDiscovered?: (media: DriveMediaInfo[]) => Promise<void>
): Promise<void> {
  if (!(indexMedia && onMediaDiscovered)) {
    return;
  }
  if (!isMediaType(file.mimeType)) {
    return;
  }
  const mediaInfo = extractMediaInfo(file);
  if (mediaInfo) {
    await onMediaDiscovered([mediaInfo]);
  }
}

function getFilesToProcess(
  added: DriveChange[],
  modified: DriveChange[]
): DriveFile[] {
  return [...added, ...modified].flatMap((change) =>
    change.file && !shouldSkipChange(change) ? [change.file] : []
  );
}

export interface ChangesSyncOptions {
  startPageToken: string;
  batchSize?: number;
  includeRemoved?: boolean;
  indexMedia?: boolean;
  extractContent?: boolean;
  onMediaDiscovered?: (media: DriveMediaInfo[]) => Promise<void>;
  onDocumentsRemoved?: (documentIds: string[]) => Promise<void>;
}

export async function* changesSync(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: ChangesSyncOptions
): AsyncGenerator<GoogleDriveSyncBatch<GenericDocument>, void, undefined> {
  const {
    startPageToken,
    batchSize = 100,
    includeRemoved = true,
    indexMedia = true,
    extractContent = true,
    onMediaDiscovered,
    onDocumentsRemoved,
  } = options;

  logger.info(
    { startPageToken, batchSize, includeRemoved },
    "Google Drive changes sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;

  const { changes: allChanges, newToken } = await collectAllChanges(
    client,
    startPageToken,
    includeRemoved
  );

  const cursor: GoogleDriveSyncCursor = {
    startPageToken: newToken ?? startPageToken,
    lastFullSync: undefined,
  };

  const { added, modified, removed } = partitionChanges(allChanges);

  logger.info(
    {
      totalChanges: allChanges.length,
      added: added.length,
      modified: modified.length,
      removed: removed.length,
    },
    "Google Drive changes partitioned"
  );

  await handleRemovedFiles(removed, context.connectorId, onDocumentsRemoved);

  const filesToProcess = getFilesToProcess(added, modified);

  for (const file of filesToProcess) {
    try {
      const document = await processFile(client, file, context, extractContent);
      documents.push(document);
      await handleMediaDiscovery(file, indexMedia, onMediaDiscovered);
      processed += 1;

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { ...cursor },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    } catch (error) {
      logger.error(
        { error, fileId: file.id, fileName: file.name },
        "Error processing Google Drive change"
      );
      errors += 1;
    }
  }

  logger.info(
    {
      processed,
      skipped,
      errors,
      documentsCount: documents.length,
      newToken: cursor.startPageToken,
    },
    "Google Drive changes sync iteration complete"
  );

  if (documents.length > 0 || processed === 0) {
    yield {
      items: documents,
      cursor: { ...cursor },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  }
}

function shouldSkipChange(change: DriveChange): boolean {
  const file = change.file;
  if (!file) {
    return true;
  }

  if (file.trashed) {
    return true;
  }

  if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.FOLDER) {
    return true;
  }

  if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.SHORTCUT) {
    return true;
  }

  return false;
}

function buildFileDocumentId(connectorId: string, fileId: string): string {
  return `${connectorId}_file_${fileId}`;
}

function extractMediaInfo(file: {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}): DriveMediaInfo | null {
  const mimeType = file.mimeType;

  let mediaType: "video" | "audio" | "image";
  if (mimeType.startsWith("video/")) {
    mediaType = "video";
  } else if (mimeType.startsWith("audio/")) {
    mediaType = "audio";
  } else if (mimeType.startsWith("image/")) {
    mediaType = "image";
  } else {
    return null;
  }

  return {
    fileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size ? Number.parseInt(file.size, 10) : 0,
    mediaType,
    webViewLink: file.webViewLink,
    thumbnailLink: file.thumbnailLink,
  };
}
