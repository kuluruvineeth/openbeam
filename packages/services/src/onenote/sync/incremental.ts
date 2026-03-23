import type {
  OneNoteSyncBatch,
  OneNoteSyncCursor,
  OneNoteTransformContext,
} from "@openbeam/types/services/connectors/onenote";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { getPageContent, listPagesModifiedSince } from "../api/pages";
import { transformOneNotePage } from "../transformers/page";
import { onenoteFullSync } from "./full";

type IncrementalSyncOptions = {
  cursor?: OneNoteSyncCursor;
  batchSize?: number;
  syncPageContent?: boolean;
  includeNotebooks?: string[];
  excludeNotebooks?: string[];
};

export async function* onenoteIncrementalSync(
  client: MicrosoftGraphClient,
  context: OneNoteTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<OneNoteSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 50 } = options;
  const syncPageContent = options.syncPageContent ?? true;

  if (
    !(cursor?.lastSyncTime && cursor?.lastFullSync) ||
    cursor?.forceFullSync
  ) {
    yield* onenoteFullSync(client, context, options);
    return;
  }

  const sinceIso = new Date(cursor.lastSyncTime).toISOString();

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const pageBatch of listPagesModifiedSince(client, sinceIso)) {
      for (const page of pageBatch) {
        const notebookName = page.parentNotebook?.displayName;

        if (
          options.includeNotebooks &&
          options.includeNotebooks.length > 0 &&
          notebookName &&
          !options.includeNotebooks.includes(notebookName)
        ) {
          continue;
        }

        if (
          options.excludeNotebooks &&
          notebookName &&
          options.excludeNotebooks.includes(notebookName)
        ) {
          continue;
        }

        try {
          let htmlContent: string | undefined;
          if (syncPageContent) {
            try {
              htmlContent = await getPageContent(client, page.id);
            } catch (contentError) {
              logger.warn(
                { error: contentError, pageId: page.id },
                "Failed to fetch page content during incremental sync"
              );
            }
          }

          documents.push(transformOneNotePage(page, context, htmlContent));
          processed += 1;

          const ts = new Date(page.lastModifiedDateTime).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, pageId: page.id },
            "Error transforming OneNote page in incremental sync"
          );
          errors += 1;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestModified,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "OneNote incremental sync failed, falling back to full sync"
    );
    yield* onenoteFullSync(client, context, options);
  }
}
