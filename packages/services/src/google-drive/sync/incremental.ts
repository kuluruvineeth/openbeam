import type { GenericDocument } from "@openplane/vespa";
import type { ConnectorFileInfo } from "../../files/types";
import type { GoogleDriveClient } from "../client";
import type {
  DriveMediaInfo,
  GoogleDriveSyncBatch,
  GoogleDriveSyncCursor,
  GoogleDriveSyncOptions,
  GoogleDriveTransformContext,
} from "../types";
import { GoogleDriveApiError, GoogleDriveErrorCodes } from "../types";
import { changesSync } from "./changes";
import { fullSync } from "./full";

export interface IncrementalSyncOptions extends GoogleDriveSyncOptions {
  onMediaDiscovered?: (media: DriveMediaInfo[]) => Promise<void>;
  onDocumentsRemoved?: (documentIds: string[]) => Promise<void>;
  onFilesDiscovered?: (files: ConnectorFileInfo[]) => Promise<void>;
  extractContent?: boolean;
}

export interface IncrementalSyncResult {
  cursor: GoogleDriveSyncCursor;
  stats: {
    documentsProcessed: number;
    documentsSkipped: number;
    errors: number;
    mediaQueued: number;
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Sync orchestration requires this complexity
export async function* googleDriveIncrementalSync(
  client: GoogleDriveClient,
  context: GoogleDriveTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<
  GoogleDriveSyncBatch<GenericDocument>,
  IncrementalSyncResult,
  undefined
> {
  const {
    cursor,
    forceFullSync = false,
    batchSize = 100,
    includeSharedDrives = true,
    includeTrashed = false,
    mimeTypeFilter,
    lookbackDays,
    indexMedia = true,
    extractContent = true,
    onMediaDiscovered,
    onDocumentsRemoved,
    onFilesDiscovered,
  } = options;

  const shouldFullSync =
    forceFullSync || !cursor?.startPageToken || !cursor?.lastFullSync;

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let mediaQueued = 0;
  let finalCursor: GoogleDriveSyncCursor = cursor ?? {};

  const handleMediaDiscovered = async (media: DriveMediaInfo[]) => {
    if (onMediaDiscovered && media.length > 0) {
      await onMediaDiscovered(media);
      mediaQueued += media.length;
    }
  };

  if (shouldFullSync) {
    for await (const batch of fullSync(client, context, {
      batchSize,
      includeSharedDrives,
      includeTrashed,
      mimeTypeFilter,
      lookbackDays,
      indexMedia,
      extractContent,
      onMediaDiscovered: handleMediaDiscovered,
      onFilesDiscovered,
    })) {
      totalProcessed += batch.stats.processed;
      totalSkipped += batch.stats.skipped;
      totalErrors += batch.stats.errors;
      finalCursor = batch.cursor;

      yield batch;
    }
  } else {
    try {
      for await (const batch of changesSync(client, context, {
        startPageToken: cursor?.startPageToken ?? "",
        batchSize,
        indexMedia,
        extractContent,
        onMediaDiscovered: handleMediaDiscovered,
        onDocumentsRemoved,
      })) {
        totalProcessed += batch.stats.processed;
        totalSkipped += batch.stats.skipped;
        totalErrors += batch.stats.errors;
        finalCursor = batch.cursor;

        yield batch;
      }
    } catch (error) {
      if (
        error instanceof GoogleDriveApiError &&
        (error.code === GoogleDriveErrorCodes.PAGE_TOKEN_EXPIRED ||
          GoogleDriveApiError.isPageTokenExpired(error.code, error.message))
      ) {
        for await (const batch of fullSync(client, context, {
          batchSize,
          includeSharedDrives,
          includeTrashed,
          mimeTypeFilter,
          lookbackDays,
          indexMedia,
          extractContent,
          onMediaDiscovered: handleMediaDiscovered,
          onFilesDiscovered,
        })) {
          totalProcessed += batch.stats.processed;
          totalSkipped += batch.stats.skipped;
          totalErrors += batch.stats.errors;
          finalCursor = batch.cursor;

          yield batch;
        }
      } else {
        throw error;
      }
    }
  }

  return {
    cursor: finalCursor,
    stats: {
      documentsProcessed: totalProcessed,
      documentsSkipped: totalSkipped,
      errors: totalErrors,
      mediaQueued,
    },
  };
}

export function shouldRunFullSync(cursor?: GoogleDriveSyncCursor): boolean {
  if (!cursor) {
    return true;
  }
  if (!cursor.startPageToken) {
    return true;
  }
  if (!cursor.lastFullSync) {
    return true;
  }

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - cursor.lastFullSync > sevenDaysMs;
}

export function createInitialCursor(): GoogleDriveSyncCursor {
  return {
    startPageToken: undefined,
    lastFullSync: undefined,
    watchChannelId: undefined,
    watchResourceId: undefined,
    watchExpiration: undefined,
  };
}

export function mergeCursors(
  existing: GoogleDriveSyncCursor,
  update: Partial<GoogleDriveSyncCursor>
): GoogleDriveSyncCursor {
  return {
    ...existing,
    ...update,
  };
}
