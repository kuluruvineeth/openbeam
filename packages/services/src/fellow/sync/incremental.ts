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
import { fellowFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* fellowIncrementalSync(
  client: FellowClient,
  context: FellowTransformContext,
  options: FellowSyncOptions = {}
): AsyncGenerator<FellowSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* fellowFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Fellow incremental sync started"
  );

  const updatedAfter = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated meetings", processed);

    for await (const meetings of listMeetings(client, { updatedAfter })) {
      for (const meeting of meetings) {
        try {
          documents.push(await transformMeeting(meeting, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, meetingId: meeting.id },
            "Error transforming meeting in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    await onStageChange?.("Syncing updated action items", processed);

    for await (const actionItems of listActionItems(client, {
      updatedAfter,
    })) {
      for (const item of actionItems) {
        try {
          documents.push(await transformActionItem(item, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, actionItemId: item.id },
            "Error transforming action item in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    await onStageChange?.("Syncing updated streams", processed);

    for await (const streams of listStreams(client, { updatedAfter })) {
      for (const stream of streams) {
        try {
          documents.push(await transformStream(stream, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, streamId: stream.id },
            "Error transforming stream in incremental sync"
          );
          errors += 1;
        }
      }
    }

    const newCursor: FellowSyncCursor = {
      lastSyncTime: Date.now(),
      lastFullSync: cursor.lastFullSync,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Fellow incremental sync failed, falling back to full"
    );
    yield* fellowFullSync(client, context, options);
  }
}
