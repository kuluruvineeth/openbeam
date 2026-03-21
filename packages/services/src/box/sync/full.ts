import type {
  BoxSyncBatch,
  BoxSyncCursor,
  BoxTransformContext,
} from "@openbeam/types/services/connectors/box";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllFolderItems } from "../api/files";
import type { BoxClient } from "../client";
import { transformBoxItem } from "../transformers/file";

export async function* boxFullSync(
  client: BoxClient,
  context: BoxTransformContext,
  options: { batchSize?: number; rootFolderId?: string } = {}
): AsyncGenerator<BoxSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const rootFolderId = options.rootFolderId ?? "0";
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for await (const page of listAllFolderItems(client, rootFolderId, true)) {
    for (const entry of page.entries) {
      if (entry.trashed_at) {
        skipped += 1;
        continue;
      }

      try {
        documents.push(transformBoxItem(entry, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, entryId: entry.id, entryName: entry.name },
          "Error transforming Box entry"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield {
        items: documents,
        cursor: { lastFullSync: Date.now() },
        hasMore: true,
        stats: { processed, skipped, errors },
      };
      documents = [];
    }
  }

  const streamPositionResponse = await client.get<{
    next_stream_position: string;
  }>("/events", { stream_position: "now", stream_type: "changes" });

  const cursor: BoxSyncCursor = {
    streamPosition: streamPositionResponse.next_stream_position,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
