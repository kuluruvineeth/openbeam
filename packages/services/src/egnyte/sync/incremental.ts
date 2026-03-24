import type {
  EgnyteSyncBatch,
  EgnyteSyncCursor,
  EgnyteTransformContext,
} from "@openbeam/types/services/connectors/egnyte";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listEvents } from "../api/events";
import type { EgnyteClient } from "../client";
import { transformEgnyteFile } from "../transformers/file";
import { egnyteFullSync } from "./full";

const FILE_CHANGE_ACTIONS = new Set([
  "file_create",
  "file_restore",
  "file_copy",
  "file_move",
  "file_rename",
  "folder_create",
  "folder_restore",
  "folder_copy",
  "folder_move",
  "folder_rename",
]);

const DELETE_ACTIONS = new Set(["file_delete", "folder_delete"]);

export async function* egnyteIncrementalSync(
  client: EgnyteClient,
  context: EgnyteTransformContext,
  options: {
    cursor?: EgnyteSyncCursor;
    batchSize?: number;
    rootFolderPath?: string;
    syncSharedLinks?: boolean;
  } = {}
): AsyncGenerator<EgnyteSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100, rootFolderPath, syncSharedLinks } = options;

  if (!cursor?.eventCursor) {
    yield* egnyteFullSync(client, context, {
      batchSize,
      rootFolderPath,
      syncSharedLinks,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestEventId = cursor.eventCursor;
  const seenPaths = new Set<string>();

  for await (const page of listEvents(client, cursor.eventCursor)) {
    latestEventId = String(page.latestEventId);

    for (const event of page.events) {
      const path = event.data?.path;
      if (!path) {
        continue;
      }

      const dedupeKey = `${event.action}_${path}`;
      if (seenPaths.has(dedupeKey)) {
        continue;
      }
      seenPaths.add(dedupeKey);

      try {
        if (DELETE_ACTIONS.has(event.action)) {
          const entryId = event.data?.entry_id ?? path;
          const isFolder = event.action === "folder_delete";
          documents.push({
            id: `${context.connectorId}_${isFolder ? "folder" : "file"}_${entryId}`,
            connector_id: context.connectorId,
            connector_type: context.connectorType,
            team_id: context.teamId,
            workspace_id: context.workspaceId,
            external_id: entryId,
            document_type: isFolder ? "folder" : "file",
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

        if (FILE_CHANGE_ACTIONS.has(event.action)) {
          const isFolder = event.action.startsWith("folder_");
          const name = path.split("/").pop() ?? path;
          documents.push(
            transformEgnyteFile(
              {
                path,
                name,
                is_folder: isFolder,
                locked: false,
                entry_id: event.data?.entry_id,
                last_modified: event.timestamp,
              },
              context
            )
          );
          processed += 1;
        }
      } catch (error) {
        logger.error(
          { error, action: event.action, path },
          "Error processing Egnyte event"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield {
        items: documents,
        cursor: {
          eventCursor: latestEventId,
          lastFullSync: cursor.lastFullSync,
          lastSyncTime: Date.now(),
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
      eventCursor: latestEventId,
      lastFullSync: cursor.lastFullSync,
      lastSyncTime: Date.now(),
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
