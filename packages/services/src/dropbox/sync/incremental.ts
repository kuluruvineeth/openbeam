import type {
  DropboxSyncBatch,
  DropboxSyncCursor,
  DropboxTransformContext,
} from "@openbeam/types/services/connectors/dropbox";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listFolderChanges } from "../api/files";
import type { DropboxClient } from "../client";
import { transformDropboxFile } from "../transformers/file";
import { DropboxApiError } from "../types";
import { dropboxFullSync } from "./full";

export async function* dropboxIncrementalSync(
  client: DropboxClient,
  context: DropboxTransformContext,
  options: {
    cursor?: DropboxSyncCursor;
    batchSize?: number;
  } = {}
): AsyncGenerator<DropboxSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!cursor?.cursor) {
    yield* dropboxFullSync(client, context, { batchSize });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestCursor = cursor.cursor;
  const deletionMarkers: GenericDocument[] = [];

  try {
    for await (const page of listFolderChanges(client, cursor.cursor)) {
      latestCursor = page.cursor;

      for (const entry of page.entries) {
        try {
          if (entry[".tag"] === "deleted") {
            deletionMarkers.push({
              id: `${context.connectorId}_file_${entry.id ?? entry.path_lower}`,
              connector_id: context.connectorId,
              connector_type: context.connectorType,
              team_id: context.teamId,
              workspace_id: context.workspaceId,
              external_id: entry.id ?? entry.path_lower ?? "",
              document_type: "file",
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

          documents.push(transformDropboxFile(entry, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, entryName: entry.name },
            "Error transforming Dropbox entry during incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { cursor: latestCursor, lastFullSync: cursor.lastFullSync },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }

    if (deletionMarkers.length > 0) {
      documents.push(...deletionMarkers);
    }

    yield {
      items: documents,
      cursor: { cursor: latestCursor, lastFullSync: cursor.lastFullSync },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    if (error instanceof DropboxApiError && error.code === "CURSOR_RESET") {
      logger.warn(
        { connectorId: client.connectorId },
        "Dropbox cursor expired, falling back to full sync"
      );
      yield* dropboxFullSync(client, context, { batchSize });
      return;
    }
    throw error;
  }
}
