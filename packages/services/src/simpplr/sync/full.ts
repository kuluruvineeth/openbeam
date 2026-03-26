import type {
  SimpplrSyncBatch,
  SimpplrSyncCursor,
  SimpplrSyncOptions,
  SimpplrTransformContext,
} from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listFiles } from "../api/files";
import { listNews } from "../api/news";
import { listPages } from "../api/pages";
import { listPeople } from "../api/people";
import { listSites } from "../api/sites";
import type { SimpplrClient } from "../client";
import { transformFile } from "../transformers/file";
import { transformNews } from "../transformers/news";
import { transformPage } from "../transformers/page";
import { transformPerson } from "../transformers/person";
import { transformSite } from "../transformers/site";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* simpplrFullSync(
  client: SimpplrClient,
  context: SimpplrTransformContext,
  options: SimpplrSyncOptions = {}
): AsyncGenerator<SimpplrSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncFiles = true,
    syncPeople = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncFiles,
      syncPeople,
    },
    "Simpplr full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: SimpplrSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing sites", state.processed);

  for await (const sites of listSites(client)) {
    for (const site of sites) {
      try {
        state.documents.push(await transformSite(site, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, siteId: site.id },
          "Error transforming Simpplr site"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing pages", state.processed);

  for await (const pages of listPages(client)) {
    for (const page of pages) {
      try {
        state.documents.push(await transformPage(page, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, pageId: page.id },
          "Error transforming Simpplr page"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing news", state.processed);

  for await (const articles of listNews(client)) {
    for (const article of articles) {
      try {
        state.documents.push(await transformNews(article, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, articleId: article.id },
          "Error transforming Simpplr news article"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncFiles) {
    await onStageChange?.("Syncing files", state.processed);

    for await (const files of listFiles(client)) {
      for (const file of files) {
        try {
          state.documents.push(await transformFile(file, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, fileId: file.id },
            "Error transforming Simpplr file"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  if (syncPeople) {
    await onStageChange?.("Syncing people", state.processed);

    for await (const people of listPeople(client)) {
      for (const person of people) {
        try {
          state.documents.push(await transformPerson(person, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, personId: person.id },
            "Error transforming Simpplr person"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Simpplr full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
