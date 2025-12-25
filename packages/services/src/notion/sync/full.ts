import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { getAllBlockChildren } from "../api/blocks";
import { getAllComments } from "../api/comments";
import { searchDatabases, searchPages } from "../api/search";
import { createUserLookup } from "../api/users";
import type { NotionClient } from "../client";
import { transformDatabase } from "../transformers/database";
import { transformPage } from "../transformers/page";
import type {
  NotionDatabase,
  NotionPage,
  NotionSyncBatch,
  NotionSyncCursor,
  NotionSyncOptions,
  NotionTransformContext,
} from "../types";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_BLOCK_DEPTH = 10;

export interface FullSyncOptions extends NotionSyncOptions {
  onProgress?: (stats: {
    processed: number;
    skipped: number;
    errors: number;
  }) => void;
  onDatabasesDiscovered?: (databases: NotionDatabase[]) => Promise<void>;
  onPagesDiscovered?: (pages: NotionPage[]) => Promise<void>;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sync orchestration requires handling multiple data sources and batching
export async function* fullSync(
  client: NotionClient,
  context: NotionTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<NotionSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    extractContent = true,
    extractComments = true,
    maxBlockDepth = DEFAULT_MAX_BLOCK_DEPTH,
    lookbackDays,
    onProgress,
    onStageChange,
    onDatabasesDiscovered,
    onPagesDiscovered,
  } = options;

  logger.info(
    { extractContent, extractComments, maxBlockDepth, lookbackDays },
    "Notion full sync started"
  );

  await onStageChange?.("Loading workspace users", 0);
  const userLookup = await createUserLookup(client);
  const enrichedContext = { ...context, userLookup };
  logger.info({ userCount: userLookup.size }, "User lookup created");

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  const cursor: NotionSyncCursor = {
    lastSyncTime: Date.now(),
  };

  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  const discoveredDatabases: NotionDatabase[] = [];
  const discoveredPages: NotionPage[] = [];

  await onStageChange?.("Discovering databases", 0);

  for await (const database of searchDatabases(client)) {
    discoveredDatabases.push(database);
    const dbTitle = database.title?.[0]?.plain_text ?? "Untitled";
    await onStageChange?.("Processing databases", processed, dbTitle);

    if (shouldSkipByTime(database.last_edited_time, lookbackTime)) {
      skipped += 1;
      continue;
    }

    try {
      const document = transformDatabase(database, enrichedContext);
      documents.push(document);
      processed += 1;

      if (documents.length >= batchSize) {
        yield createBatch(documents, cursor, true, {
          processed,
          skipped,
          errors,
        });
        documents = [];
        onProgress?.({ processed, skipped, errors });
      }
    } catch (error) {
      logger.error(
        { error, databaseId: database.id },
        "Error processing Notion database"
      );
      errors += 1;
    }
  }

  if (onDatabasesDiscovered && discoveredDatabases.length > 0) {
    await onDatabasesDiscovered(discoveredDatabases);
  }

  await onStageChange?.("Discovering pages", processed);

  for await (const page of searchPages(client)) {
    if (page.parent.type === "workspace") {
      discoveredPages.push(page);
    }

    if (shouldSkipByTime(page.last_edited_time, lookbackTime)) {
      skipped += 1;
      continue;
    }

    if (page.archived || page.in_trash) {
      skipped += 1;
      continue;
    }

    const pageTitle = getPageTitle(page);
    await onStageChange?.("Processing pages", processed, pageTitle);

    try {
      const blocks = extractContent
        ? await getAllBlockChildren(client, page.id, maxBlockDepth)
        : undefined;

      const comments = extractComments
        ? await getAllComments(client, { blockId: page.id })
        : undefined;

      const document = transformPage(page, enrichedContext, {
        blocks,
        comments,
      });
      documents.push(document);
      processed += 1;

      if (documents.length >= batchSize) {
        yield createBatch(documents, cursor, true, {
          processed,
          skipped,
          errors,
        });
        documents = [];
        onProgress?.({ processed, skipped, errors });
      }
    } catch (error) {
      logger.error({ error, pageId: page.id }, "Error processing Notion page");
      errors += 1;
    }
  }

  if (onPagesDiscovered && discoveredPages.length > 0) {
    await onPagesDiscovered(discoveredPages);
  }

  logger.info(
    { processed, skipped, errors, documentsCount: documents.length },
    "Notion full sync iteration complete"
  );

  if (documents.length > 0) {
    yield createBatch(documents, cursor, false, { processed, skipped, errors });
  }
}

function shouldSkipByTime(
  lastEditedTime: string,
  lookbackTime: number | undefined
): boolean {
  if (!lookbackTime) {
    return false;
  }
  const editedAt = new Date(lastEditedTime).getTime();
  return editedAt < lookbackTime;
}

function getPageTitle(page: NotionPage): string {
  const properties = page.properties as Record<
    string,
    { type: string; title?: Array<{ plain_text: string }> }
  >;
  for (const prop of Object.values(properties)) {
    if (prop.type === "title" && prop.title?.[0]) {
      return prop.title[0].plain_text;
    }
  }
  return "Untitled";
}

function createBatch(
  items: GenericDocument[],
  cursor: NotionSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): NotionSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
