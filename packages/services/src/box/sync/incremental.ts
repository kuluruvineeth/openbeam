import type {
  BoxSyncBatch,
  BoxSyncCursor,
  BoxTransformContext,
} from "@openbeam/types/services/connectors/box";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listEvents } from "../api/files";
import type { BoxClient, BoxItem } from "../client";
import { transformBoxItem } from "../transformers/file";
import { boxFullSync } from "./full";

const ITEM_EVENT_TYPES = new Set([
  "ITEM_CREATE",
  "ITEM_UPLOAD",
  "ITEM_MOVE",
  "ITEM_COPY",
  "ITEM_RENAME",
  "ITEM_UNDELETE_VIA_TRASH",
  "ITEM_SHARED_CREATE",
  "ITEM_SHARED_UPDATE",
]);

const DELETE_EVENT_TYPES = new Set([
  "ITEM_TRASH",
  "ITEM_DELETE",
  "ITEM_SHARED_UNSHARE",
]);

export async function* boxIncrementalSync(
  client: BoxClient,
  context: BoxTransformContext,
  options: {
    cursor?: BoxSyncCursor;
    batchSize?: number;
    rootFolderId?: string;
  } = {}
): AsyncGenerator<BoxSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100, rootFolderId } = options;

  if (!cursor?.streamPosition) {
    yield* boxFullSync(client, context, { batchSize, rootFolderId });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestPosition = cursor.streamPosition;
  const seenIds = new Set<string>();

  for await (const page of listEvents(client, cursor.streamPosition)) {
    latestPosition = page.nextStreamPosition;

    for (const event of page.events) {
      const source = event.source;
      if (!source?.id) {
        continue;
      }

      const dedupeKey = `${event.event_type}_${source.id}`;
      if (seenIds.has(dedupeKey)) {
        continue;
      }
      seenIds.add(dedupeKey);

      try {
        if (DELETE_EVENT_TYPES.has(event.event_type)) {
          documents.push({
            id: `${context.connectorId}_${source.type ?? "file"}_${source.id}`,
            connector_id: context.connectorId,
            connector_type: context.connectorType,
            team_id: context.teamId,
            workspace_id: context.workspaceId,
            external_id: source.id,
            document_type: source.type ?? "file",
            title: "",
            content: "",
            created_at: 0,
            updated_at: Date.now(),
            is_public: false,
            metadata: { deleted: true, deletedAt: Date.now() },
          } as unknown as GenericDocument);
          processed += 1;
          continue;
        }

        if (ITEM_EVENT_TYPES.has(event.event_type)) {
          documents.push(transformBoxItem(source as BoxItem, context));
          processed += 1;
        }
      } catch (error) {
        logger.error(
          { error, eventId: event.event_id, sourceId: source.id },
          "Error processing Box event"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield {
        items: documents,
        cursor: {
          streamPosition: latestPosition,
          lastFullSync: cursor.lastFullSync,
        },
        hasMore: true,
        stats: { processed, skipped, errors },
      };
      documents = [];
    }
  }

  yield {
    items: documents,
    cursor: {
      streamPosition: latestPosition,
      lastFullSync: cursor.lastFullSync,
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
