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
import { simpplrFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* simpplrIncrementalSync(
  client: SimpplrClient,
  context: SimpplrTransformContext,
  options: SimpplrSyncOptions = {}
): AsyncGenerator<SimpplrSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncFiles = true,
    syncPeople = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* simpplrFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Simpplr incremental sync started"
  );

  const modifiedAfter = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated sites", processed);

    for await (const sites of listSites(client, { modifiedAfter })) {
      for (const site of sites) {
        try {
          documents.push(await transformSite(site, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, siteId: site.id },
            "Error transforming site in incremental sync"
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

    await onStageChange?.("Syncing updated pages", processed);

    for await (const pages of listPages(client, { modifiedAfter })) {
      for (const page of pages) {
        try {
          documents.push(await transformPage(page, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, pageId: page.id },
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
            { error, articleId: article.id },
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

    if (syncFiles) {
      for await (const files of listFiles(client, { modifiedAfter })) {
        for (const file of files) {
          try {
            documents.push(await transformFile(file, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, fileId: file.id },
              "Error transforming file in incremental sync"
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
              { error, personId: person.id },
              "Error transforming person in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: SimpplrSyncCursor = {
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
      "Simpplr incremental sync failed, falling back to full"
    );
    yield* simpplrFullSync(client, context, options);
  }
}
