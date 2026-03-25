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
import { interactFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* interactIncrementalSync(
  client: InteractClient,
  context: InteractTransformContext,
  options: InteractSyncOptions = {}
): AsyncGenerator<InteractSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncDocuments = true,
    syncPeople = true,
    syncSpaces = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* interactFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Interact incremental sync started"
  );

  const modifiedAfter = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated pages", processed);

    for await (const pages of listPages(client, { modifiedAfter })) {
      for (const page of pages) {
        try {
          documents.push(await transformPage(page, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, pageId: page.Id },
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

    await onStageChange?.("Syncing updated news", processed);

    for await (const articles of listNews(client, { modifiedAfter })) {
      for (const article of articles) {
        try {
          documents.push(await transformNews(article, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, articleId: article.Id },
            "Error transforming news in incremental sync"
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

    if (syncDocuments) {
      for await (const docs of listDocuments(client, { modifiedAfter })) {
        for (const doc of docs) {
          try {
            documents.push(await transformDocument(doc, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, documentId: doc.Id },
              "Error transforming document in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncPeople) {
      for await (const people of listPeople(client, { modifiedAfter })) {
        for (const person of people) {
          try {
            documents.push(await transformPerson(person, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, personId: person.Id },
              "Error transforming person in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncSpaces) {
      for await (const spaces of listSpaces(client, { modifiedAfter })) {
        for (const space of spaces) {
          try {
            documents.push(await transformSpace(space, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, spaceId: space.Id },
              "Error transforming space in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: InteractSyncCursor = {
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
      "Interact incremental sync failed, falling back to full"
    );
    yield* interactFullSync(client, context, options);
  }
}
