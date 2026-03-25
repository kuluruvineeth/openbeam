import type {
  LucidSyncBatch,
  LucidSyncCursor,
  LucidTransformContext,
} from "@openbeam/types/services/connectors/lucid";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllDocuments } from "../api/documents";
import { listAllFolders } from "../api/folders";
import { listDocumentPages } from "../api/pages";
import type { LucidClient } from "../client";
import { transformLucidDocument } from "../transformers/document";
import { transformLucidFolder } from "../transformers/folder";
import { transformLucidPage } from "../transformers/page";

export async function* lucidFullSync(
  client: LucidClient,
  context: LucidTransformContext,
  options: {
    batchSize?: number;
    syncPages?: boolean;
    syncFolders?: boolean;
  } = {}
): AsyncGenerator<LucidSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncPages = options.syncPages ?? true;
  const syncFolders = options.syncFolders ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const docs of listAllDocuments(client)) {
    for (const doc of docs) {
      try {
        documents.push(transformLucidDocument(doc, context));
        processed += 1;
        latestModified = trackModified(doc.lastModifiedDate, latestModified);

        if (syncPages && doc.pageCount > 1) {
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
              "Error fetching Lucid document pages"
            );
            errors += 1;
          }
        }
      } catch (error) {
        logger.error(
          { error, documentId: doc.id },
          "Error transforming Lucid document"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestModified
      );
      documents = [];
    }
  }

  if (syncFolders) {
    for await (const folders of listAllFolders(client)) {
      for (const folder of folders) {
        try {
          documents.push(transformLucidFolder(folder, context));
          processed += 1;
          latestModified = trackModified(
            folder.lastModifiedDate,
            latestModified
          );
        } catch (error) {
          logger.error(
            { error, folderId: folder.id },
            "Error transforming Lucid folder"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  const cursor: LucidSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): LucidSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(dateStr: string, current: number): number {
  const ts = new Date(dateStr).getTime();
  return ts > current ? ts : current;
}
