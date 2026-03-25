import type {
  LucidSyncBatch,
  LucidSyncCursor,
  LucidTransformContext,
} from "@openbeam/types/services/connectors/lucid";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllDocuments } from "../api/documents";
import { listDocumentPages } from "../api/pages";
import type { LucidClient } from "../client";
import { transformLucidDocument } from "../transformers/document";
import { transformLucidPage } from "../transformers/page";
import { lucidFullSync } from "./full";

type SyncOptions = {
  cursor?: LucidSyncCursor;
  batchSize?: number;
  syncPages?: boolean;
  syncFolders?: boolean;
};

export async function* lucidIncrementalSync(
  client: LucidClient,
  context: LucidTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<LucidSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* lucidFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const docs of listAllDocuments(client, {
      modifiedSince: sinceDate,
    })) {
      for (const doc of docs) {
        try {
          const docModified = new Date(doc.lastModifiedDate).getTime();
          if (docModified <= cursor.lastSyncTime) {
            continue;
          }

          documents.push(transformLucidDocument(doc, context));
          processed += 1;
          if (docModified > latestModified) {
            latestModified = docModified;
          }

          if (options.syncPages !== false && doc.pageCount > 1) {
            try {
              const pages = await listDocumentPages(client, doc.id);
              for (const page of pages) {
                documents.push(
                  transformLucidPage(
                    page,
                    doc.title,
                    doc.editUrl || doc.viewUrl,
                    context
                  )
                );
                processed += 1;
              }
            } catch (pageError) {
              logger.error(
                { error: pageError, documentId: doc.id },
                "Error fetching Lucid document pages during incremental sync"
              );
              errors += 1;
            }
          }
        } catch (error) {
          logger.error(
            { error, documentId: doc.id },
            "Error transforming Lucid document during incremental sync"
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
      "Lucid incremental sync failed, falling back to full"
    );
    yield* lucidFullSync(client, context, options);
  }
}
