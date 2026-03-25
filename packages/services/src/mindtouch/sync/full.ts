import type {
  MindtouchSyncBatch,
  MindtouchSyncCursor,
  MindtouchSyncOptions,
  MindtouchTransformContext,
} from "@openbeam/types/services/connectors/mindtouch";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listCategories } from "../api/categories";
import { getPageContent, listPages } from "../api/pages";
import { listTags } from "../api/tags";
import type { MindtouchClient } from "../client";
import { transformCategory } from "../transformers/category";
import { transformPage } from "../transformers/page";
import { transformTag } from "../transformers/tag";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* mindtouchFullSync(
  client: MindtouchClient,
  context: MindtouchTransformContext,
  options: MindtouchSyncOptions = {}
): AsyncGenerator<MindtouchSyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  logger.info(
    { connectorId: client.connectorId },
    "Mindtouch full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: MindtouchSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing pages", state.processed);

  for await (const pages of listPages(client)) {
    for (const page of pages) {
      try {
        let htmlContent: string | undefined;
        try {
          htmlContent = await getPageContent(client, page["@id"]);
        } catch (contentError) {
          logger.warn(
            { pageId: page["@id"], error: contentError },
            "Failed to fetch page content, indexing metadata only"
          );
        }

        state.documents.push(await transformPage(page, context, htmlContent));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, pageId: page["@id"] },
          "Error transforming Mindtouch page"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing categories", state.processed);

  for await (const categories of listCategories(client)) {
    for (const category of categories) {
      try {
        state.documents.push(await transformCategory(category, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, categoryId: category["@id"] },
          "Error transforming Mindtouch category"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing tags", state.processed);

  for await (const tags of listTags(client)) {
    for (const tag of tags) {
      try {
        state.documents.push(await transformTag(tag, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, tagId: tag["@id"] },
          "Error transforming Mindtouch tag"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Mindtouch full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
