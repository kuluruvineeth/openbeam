import type {
  MindtouchSyncBatch,
  MindtouchSyncCursor,
  MindtouchSyncOptions,
  MindtouchTransformContext,
} from "@openbeam/types/services/connectors/mindtouch";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getPageContent, listPages } from "../api/pages";
import type { MindtouchClient } from "../client";
import { transformPage } from "../transformers/page";
import { mindtouchFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* mindtouchIncrementalSync(
  client: MindtouchClient,
  context: MindtouchTransformContext,
  options: MindtouchSyncOptions = {}
): AsyncGenerator<MindtouchSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* mindtouchFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Mindtouch incremental sync started"
  );

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated pages", processed);

    for await (const pages of listPages(client, { updatedSince })) {
      for (const page of pages) {
        try {
          let htmlContent: string | undefined;
          try {
            htmlContent = await getPageContent(client, page["@id"]);
          } catch (contentError) {
            logger.warn(
              { pageId: page["@id"], error: contentError },
              "Failed to fetch page content during incremental sync"
            );
          }

          documents.push(await transformPage(page, context, htmlContent));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, pageId: page["@id"] },
            "Error transforming page in incremental sync"
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

    const newCursor: MindtouchSyncCursor = {
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
      "Mindtouch incremental sync failed, falling back to full"
    );
    yield* mindtouchFullSync(client, context, options);
  }
}
