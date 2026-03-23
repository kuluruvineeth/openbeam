import type {
  GuruSyncBatch,
  GuruSyncCursor,
  GuruSyncOptions,
  GuruTransformContext,
} from "@openbeam/types/services/connectors/guru";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { GuruClient } from "../client";
import type { GuruCard } from "../transformers/card";
import { transformCard } from "../transformers/card";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* incrementalSync(
  client: GuruClient,
  context: GuruTransformContext,
  options: GuruSyncOptions = {}
): AsyncGenerator<GuruSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor: prevCursor,
    batchSize = DEFAULT_BATCH_SIZE,
    verifiedOnly = false,
    onStageChange,
  } = options;

  if (!prevCursor?.lastSyncTime) {
    logger.warn("No previous cursor, skipping incremental sync");
    return;
  }

  logger.info(
    { connectorId: client.connectorId },
    "Guru incremental sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: GuruSyncCursor = {
    ...prevCursor,
    lastSyncTime: Date.now(),
  };

  let latestModifiedAt = prevCursor.lastCardModifiedAt;

  const sinceDate = prevCursor.lastCardModifiedAt
    ? prevCursor.lastCardModifiedAt
    : new Date(prevCursor.lastSyncTime).toISOString();

  await onStageChange?.("Fetching updated cards", state.processed);

  for await (const page of client.getPaginated<GuruCard>("/search/cardmgr", {
    lastModified: sinceDate,
  })) {
    for (const card of page) {
      try {
        if (verifiedOnly && card.verificationState !== "TRUSTED") {
          state.skipped += 1;
          continue;
        }

        if (
          card.lastModified &&
          (!latestModifiedAt || card.lastModified > latestModifiedAt)
        ) {
          latestModifiedAt = card.lastModified;
        }

        await onStageChange?.(
          "Processing card updates",
          state.processed,
          card.preferredPhrase
        );

        state.documents.push(await transformCard(card, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastCardModifiedAt = latestModifiedAt;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, cardId: card.id },
          "Error processing Guru card update"
        );
        state.errors += 1;
      }
    }
  }

  cursor.lastCardModifiedAt = latestModifiedAt;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Guru incremental sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
