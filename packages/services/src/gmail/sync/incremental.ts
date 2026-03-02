import type {
  GmailAttachmentInfo,
  GmailLabel,
  GmailMediaInfo,
  GmailProfile,
  GmailSyncBatch,
  GmailSyncCursor,
  GmailSyncOptions,
  GmailTransformContext,
} from "@openplane/types/services/connectors/gmail";
import type { GenericDocument } from "@openplane/vespa";
import { createLabelLookup } from "../api/labels";
import type { GmailClient } from "../client";
import { GmailApiError, GmailErrorCodes } from "../types";
import { fullSync } from "./full";
import { historySync } from "./history";

export interface IncrementalSyncOptions extends GmailSyncOptions {
  onLabelsDiscovered?: (labels: GmailLabel[]) => Promise<void>;
  onAttachmentsDiscovered?: (
    attachments: GmailAttachmentInfo[]
  ) => Promise<void>;
  onMediaDiscovered?: (media: GmailMediaInfo[]) => Promise<void>;
}

export interface IncrementalSyncResult {
  cursor: GmailSyncCursor;
  stats: {
    documentsProcessed: number;
    documentsSkipped: number;
    errors: number;
    attachmentsQueued: number;
    mediaQueued: number;
  };
}

export async function* gmailIncrementalSync(
  client: GmailClient,
  context: GmailTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<
  GmailSyncBatch<GenericDocument>,
  IncrementalSyncResult,
  undefined
> {
  const {
    cursor,
    forceFullSync = false,
    batchSize = 100,
    includeLabels,
    excludeLabels,
    lookbackDays,
    indexAttachments = true,
    indexMedia = true,
    onLabelsDiscovered,
    onAttachmentsDiscovered,
    onMediaDiscovered,
  } = options;

  const shouldFullSync =
    forceFullSync || !cursor?.historyId || !cursor?.lastFullSync;

  const labelLookup = await createLabelLookup(client);

  if (onLabelsDiscovered) {
    await onLabelsDiscovered(labelLookup.all());
  }

  const syncOptions = {
    batchSize,
    includeLabels,
    excludeLabels,
    lookbackDays,
    indexAttachments,
    indexMedia,
    labelLookup,
    onAttachmentsDiscovered,
    onMediaDiscovered,
  };

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let previousProcessed = 0;
  let previousSkipped = 0;
  let previousErrors = 0;
  const attachmentsQueued = 0;
  const mediaQueued = 0;
  let finalCursor: GmailSyncCursor = cursor ?? {};

  const updateTotalsFromBatch = (batch: GmailSyncBatch<GenericDocument>) => {
    const processedDelta =
      batch.stats.processed >= previousProcessed
        ? batch.stats.processed - previousProcessed
        : batch.stats.processed;
    const skippedDelta =
      batch.stats.skipped >= previousSkipped
        ? batch.stats.skipped - previousSkipped
        : batch.stats.skipped;
    const errorsDelta =
      batch.stats.errors >= previousErrors
        ? batch.stats.errors - previousErrors
        : batch.stats.errors;

    totalProcessed += processedDelta;
    totalSkipped += skippedDelta;
    totalErrors += errorsDelta;

    previousProcessed = batch.stats.processed;
    previousSkipped = batch.stats.skipped;
    previousErrors = batch.stats.errors;
  };

  if (shouldFullSync) {
    const profile = await client.get<GmailProfile>("/users/me/profile");

    for await (const batch of fullSync(client, context, {
      ...syncOptions,
      initialHistoryId: profile.historyId,
    })) {
      updateTotalsFromBatch(batch);
      finalCursor = batch.cursor;

      yield batch;
    }
  } else {
    try {
      for await (const batch of historySync(client, context, {
        ...syncOptions,
        startHistoryId: cursor?.historyId ?? "",
      })) {
        updateTotalsFromBatch(batch);
        finalCursor = batch.cursor;

        yield batch;
      }
    } catch (error) {
      if (
        error instanceof GmailApiError &&
        error.code === GmailErrorCodes.HISTORY_ID_EXPIRED
      ) {
        const profile = await client.get<GmailProfile>("/users/me/profile");

        for await (const batch of fullSync(client, context, {
          ...syncOptions,
          initialHistoryId: profile.historyId,
        })) {
          updateTotalsFromBatch(batch);
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
      attachmentsQueued,
      mediaQueued,
    },
  };
}

export function shouldRunFullSync(cursor?: GmailSyncCursor): boolean {
  if (!cursor) {
    return true;
  }
  if (!cursor.historyId) {
    return true;
  }
  if (!cursor.lastFullSync) {
    return true;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const maxAgeMs = 7 * oneDayMs;

  return Date.now() - cursor.lastFullSync > maxAgeMs;
}

export function createInitialCursor(): GmailSyncCursor {
  return {
    lastFullSync: undefined,
    historyId: undefined,
    lastMessageTimestamp: undefined,
    pageToken: undefined,
    watchExpiration: undefined,
    labelCursors: {},
  };
}

export function mergeCursors(
  existing: GmailSyncCursor,
  update: Partial<GmailSyncCursor>
): GmailSyncCursor {
  return {
    ...existing,
    ...update,
    labelCursors: {
      ...existing.labelCursors,
      ...update.labelCursors,
    },
  };
}
