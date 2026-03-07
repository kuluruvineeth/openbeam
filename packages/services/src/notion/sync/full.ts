import type {
  NotionDatabase,
  NotionPage,
  NotionSyncBatch,
  NotionSyncCursor,
  NotionSyncOptions,
  NotionTransformContext,
} from "@openbeam/types/services/connectors/notion";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllBlockChildren } from "../api/blocks";
import { getAllComments } from "../api/comments";
import { searchDatabases, searchPages } from "../api/search";
import { createUserLookup } from "../api/users";
import type { NotionClient } from "../client";
import { transformDatabase } from "../transformers/database";
import { transformPage } from "../transformers/page";

const DEFAULT_BATCH_SIZE = 5;
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
    { extractContent, extractComments, maxBlockDepth, lookbackDays, batchSize },
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

  const cursor: NotionSyncCursor = options.cursor ?? {
    lastSyncTime: Date.now(),
  };

  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  const discoveredDatabases: NotionDatabase[] = [];
  const discoveredPages: NotionPage[] = [];

  logger.info("Starting database discovery");
  await onStageChange?.("Discovering databases", 0);

  let dbCount = 0;

  const dbSearchOptions = options.cursor?.lastSyncTime
    ? {
        sort: {
          direction: "descending" as const,
          timestamp: "last_edited_time" as const,
        },
      }
    : {};

  for await (const database of searchDatabases(client, dbSearchOptions)) {
    dbCount += 1;
    if (dbCount % 10 === 1) {
      logger.info({ dbCount }, "Processing databases");
    }
    discoveredDatabases.push(database);
    const dbTitle = database.title?.[0]?.plain_text ?? "Untitled";
    await onStageChange?.("Processing databases", processed, dbTitle);

    const editedAt = new Date(database.last_edited_time).getTime();

    if (
      options.cursor?.lastSyncTime &&
      editedAt < options.cursor.lastSyncTime
    ) {
      break;
    }

    if (shouldSkipByTime(database.last_edited_time, lookbackTime)) {
      skipped += 1;
      continue;
    }

    if (database.archived || database.in_trash) {
      documents.push(createDatabaseDeleteMarker(enrichedContext, database.id));
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
      continue;
    }

    try {
      const document = await transformDatabase(database, enrichedContext);
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

  logger.info(
    { databasesFound: discoveredDatabases.length, processed, skipped, errors },
    "Database discovery complete, starting page discovery"
  );
  await onStageChange?.("Discovering pages", processed);

  let pageCount = 0;
  let skippedByTime = 0;
  let skippedByArchived = 0;

  const searchOptions = options.cursor?.lastSyncTime
    ? {
        sort: {
          direction: "descending" as const,
          timestamp: "last_edited_time" as const,
        },
      }
    : {};

  for await (const page of searchPages(client, searchOptions)) {
    pageCount += 1;
    const pageTitle = getPageTitle(page);
    if (pageCount % 10 === 1) {
      logger.info(
        { pageCount, processed, skipped, skippedByTime, skippedByArchived },
        "Processing pages"
      );
    }
    if (page.parent.type === "workspace") {
      discoveredPages.push(page);
    }

    const editedAt = new Date(page.last_edited_time).getTime();

    if (
      options.cursor?.lastSyncTime &&
      editedAt < options.cursor.lastSyncTime
    ) {
      break;
    }

    if (shouldSkipByTime(page.last_edited_time, lookbackTime)) {
      skippedByTime += 1;
      skipped += 1;
      logger.debug(
        { pageId: page.id, pageTitle, lastEdited: page.last_edited_time },
        "Page skipped by time filter"
      );
      continue;
    }

    if (page.archived || page.in_trash) {
      skippedByArchived += 1;
      logger.debug(
        {
          pageId: page.id,
          pageTitle,
          archived: page.archived,
          inTrash: page.in_trash,
        },
        "Page archived or in trash - emitting delete marker"
      );

      documents.push(createPageDeleteMarker(enrichedContext, page.id));
      processed += 1;

      if (documents.length >= batchSize) {
        logger.info(
          { batchSize: documents.length, processed, skipped, errors },
          "Yielding batch"
        );
        yield createBatch(documents, cursor, true, {
          processed,
          skipped,
          errors,
        });
        documents = [];
        onProgress?.({ processed, skipped, errors });
      }
      continue;
    }

    await onStageChange?.("Processing pages", processed, pageTitle);

    try {
      logger.info(
        {
          pageId: page.id,
          pageTitle,
          parentType: page.parent.type,
          pageCount,
          processed,
        },
        "Processing page - will fetch blocks and comments"
      );
      const blocks = extractContent
        ? await getAllBlockChildren(client, page.id, maxBlockDepth)
        : undefined;

      logger.debug(
        { pageId: page.id, blockCount: blocks?.length ?? 0 },
        "Fetching page comments"
      );
      const comments = extractComments
        ? await getAllComments(client, { blockId: page.id })
        : undefined;

      const document = await transformPage(page, enrichedContext, {
        blocks,
        comments,
      });
      documents.push(document);
      processed += 1;

      logger.debug(
        {
          pageId: page.id,
          processed,
          documentsInBatch: documents.length,
          batchSize,
        },
        "Page processed"
      );

      if (documents.length >= batchSize) {
        logger.info(
          { batchSize: documents.length, processed, skipped, errors },
          "Yielding batch"
        );
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
    {
      totalPagesFromSearch: pageCount,
      processed,
      skipped,
      skippedByTime,
      skippedByArchived,
      errors,
      documentsInFinalBatch: documents.length,
      workspacePagesDiscovered: discoveredPages.length,
    },
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

function createPageDeleteMarker(
  context: NotionTransformContext,
  pageId: string
): GenericDocument {
  return {
    id: `${context.connectorId}_page_${pageId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: pageId,
    document_type: "page",
    title: "",
    content: "",
    created_at: 0,
    updated_at: Date.now(),
    is_public: false,
    metadata: {
      deleted: true,
      deletedAt: Date.now(),
    },
  };
}

function createDatabaseDeleteMarker(
  context: NotionTransformContext,
  databaseId: string
): GenericDocument {
  return {
    id: `${context.connectorId}_database_${databaseId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: databaseId,
    document_type: "database",
    title: "",
    content: "",
    created_at: 0,
    updated_at: Date.now(),
    is_public: false,
    metadata: {
      deleted: true,
      deletedAt: Date.now(),
    },
  };
}
