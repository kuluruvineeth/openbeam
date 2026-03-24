import type {
  EgnyteSyncBatch,
  EgnyteSyncCursor,
  EgnyteTransformContext,
} from "@openbeam/types/services/connectors/egnyte";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllFolderItems } from "../api/files";
import { listAllLinks } from "../api/links";
import type { EgnyteClient } from "../client";
import { transformEgnyteFile } from "../transformers/file";
import { transformEgnyteLink } from "../transformers/link";

export async function* egnyteFullSync(
  client: EgnyteClient,
  context: EgnyteTransformContext,
  options: {
    batchSize?: number;
    rootFolderPath?: string;
    syncSharedLinks?: boolean;
  } = {}
): AsyncGenerator<EgnyteSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const rootFolderPath = options.rootFolderPath ?? "/Shared";
  const syncSharedLinks = options.syncSharedLinks ?? true;
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;

  for await (const page of listAllFolderItems(client, rootFolderPath, true)) {
    for (const entry of page.entries) {
      try {
        documents.push(transformEgnyteFile(entry, context));
        processed += 1;
      } catch (error) {
        logger.error(
          { error, entryPath: entry.path, entryName: entry.name },
          "Error transforming Egnyte entry"
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

  if (syncSharedLinks) {
    for await (const page of listAllLinks(client)) {
      for (const link of page.links) {
        try {
          documents.push(transformEgnyteLink(link, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, linkId: link.id },
            "Error transforming Egnyte link"
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
  }

  let eventCursor: string | undefined;
  try {
    const eventsResponse = await client.getEvents("latest", 1);
    eventCursor = String(eventsResponse.latest_event_id);
  } catch {
    logger.warn(
      { connectorId: client.connectorId },
      "Failed to get initial event cursor, incremental sync will fallback to full"
    );
  }

  const cursor: EgnyteSyncCursor = {
    eventCursor,
    lastFullSync: Date.now(),
    lastSyncTime: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
