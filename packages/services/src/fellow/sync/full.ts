import type {
  FellowSyncBatch,
  FellowSyncCursor,
  FellowSyncOptions,
  FellowTransformContext,
} from "@openbeam/types/services/connectors/fellow";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listActionItems } from "../api/action-items";
import { listMeetings } from "../api/meetings";
import { listStreams } from "../api/streams";
import type { FellowClient } from "../client";
import { transformActionItem } from "../transformers/action-item";
import { transformMeeting } from "../transformers/meeting";
import { transformStream } from "../transformers/stream";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* fellowFullSync(
  client: FellowClient,
  context: FellowTransformContext,
  options: FellowSyncOptions = {}
): AsyncGenerator<FellowSyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  logger.info({ connectorId: client.connectorId }, "Fellow full sync started");

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: FellowSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing meetings", state.processed);

  for await (const meetings of listMeetings(client)) {
    for (const meeting of meetings) {
      try {
        state.documents.push(await transformMeeting(meeting, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, meetingId: meeting.id },
          "Error transforming Fellow meeting"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing action items", state.processed);

  for await (const actionItems of listActionItems(client)) {
    for (const item of actionItems) {
      try {
        state.documents.push(await transformActionItem(item, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, actionItemId: item.id },
          "Error transforming Fellow action item"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing streams", state.processed);

  for await (const streams of listStreams(client)) {
    for (const stream of streams) {
      try {
        state.documents.push(await transformStream(stream, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, streamId: stream.id },
          "Error transforming Fellow stream"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Fellow full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
