import type {
  InteractSyncBatch,
  InteractSyncCursor,
  InteractSyncOptions,
  InteractTransformContext,
} from "@openbeam/types/services/connectors/interact";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listDocuments } from "../api/documents";
import { listNews } from "../api/news";
import { listPages } from "../api/pages";
import { listPeople } from "../api/people";
import { listSpaces } from "../api/spaces";
import type { InteractClient } from "../client";
import { transformDocument } from "../transformers/document";
import { transformNews } from "../transformers/news";
import { transformPage } from "../transformers/page";
import { transformPerson } from "../transformers/person";
import { transformSpace } from "../transformers/space";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* interactFullSync(
  client: InteractClient,
  context: InteractTransformContext,
  options: InteractSyncOptions = {}
): AsyncGenerator<InteractSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncDocuments = true,
    syncPeople = true,
    syncSpaces = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncDocuments,
      syncPeople,
      syncSpaces,
    },
    "Interact full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: InteractSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing pages", state.processed);

  for await (const pages of listPages(client)) {
    for (const page of pages) {
      try {
        state.documents.push(await transformPage(page, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, pageId: page.Id },
          "Error transforming Interact page"
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
          { error, articleId: article.Id },
          "Error transforming Interact news article"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncDocuments) {
    await onStageChange?.("Syncing documents", state.processed);

    for await (const docs of listDocuments(client)) {
      for (const doc of docs) {
        try {
          state.documents.push(await transformDocument(doc, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, documentId: doc.Id },
            "Error transforming Interact document"
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
            { error, personId: person.Id },
            "Error transforming Interact person"
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

  if (syncSpaces) {
    await onStageChange?.("Syncing spaces", state.processed);

    for await (const spaces of listSpaces(client)) {
      for (const space of spaces) {
        try {
          state.documents.push(await transformSpace(space, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, spaceId: space.Id },
            "Error transforming Interact space"
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
    "Interact full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
