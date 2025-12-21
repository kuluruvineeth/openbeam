import type { GenericDocument } from "@openplane/vespa";
import { createLabelLookup } from "../api/labels";
import type { GmailClient } from "../client";
import type {
  GmailAttachmentInfo,
  GmailLabel,
  GmailMediaInfo,
  GmailProfile,
  GmailSyncBatch,
  GmailSyncCursor,
  GmailSyncOptions,
  GmailTransformContext,
} from "../types";
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: incremental sync handles both full and history modes
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
  const attachmentsQueued = 0;
  const mediaQueued = 0;
  let finalCursor: GmailSyncCursor = cursor ?? {};

  if (shouldFullSync) {
    const profile = await client.get<GmailProfile>("/users/me/profile");

    for await (const batch of fullSync(client, context, {
      ...syncOptions,
      initialHistoryId: profile.historyId,
    })) {
      totalProcessed += batch.stats.processed;
      totalSkipped += batch.stats.skipped;
      totalErrors += batch.stats.errors;
      finalCursor = batch.cursor;

      yield batch;
    }
  } else {
    try {
      for await (const batch of historySync(client, context, {
        ...syncOptions,
        startHistoryId: cursor?.historyId ?? "",
      })) {
        totalProcessed += batch.stats.processed;
        totalSkipped += batch.stats.skipped;
        totalErrors += batch.stats.errors;
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
