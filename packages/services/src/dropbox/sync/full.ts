import type {
  DropboxSyncBatch,
  DropboxSyncCursor,
  DropboxTransformContext,
} from "@openbeam/types/services/connectors/dropbox";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllFiles } from "../api/files";
import type { DropboxClient } from "../client";
import { transformDropboxFile } from "../transformers/file";

export async function* dropboxFullSync(
  client: DropboxClient,
  context: DropboxTransformContext,
  options: { batchSize?: number } = {}
): AsyncGenerator<DropboxSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestCursor: string | undefined;

  for await (const page of listAllFiles(client, "", true)) {
    latestCursor = page.cursor;

    for (const entry of page.entries) {
      try {
        documents.push(transformDropboxFile(entry, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, entryId: entry.id, entryName: entry.name },
          "Error transforming Dropbox entry"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield {
        items: documents,
        cursor: { cursor: latestCursor, lastFullSync: Date.now() },
        hasMore: true,
        stats: { processed, skipped, errors },
      };
      documents = [];
    }
  }

  const cursor: DropboxSyncCursor = {
    cursor: latestCursor,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
