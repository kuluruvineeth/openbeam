import type {
  NotionDatabase,
  NotionPage,
  NotionSyncBatch,
  NotionSyncCursor,
  NotionSyncOptions,
  NotionTransformContext,
} from "@openplane/types/services/connectors/notion";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { getAllBlockChildren } from "../api/blocks";
import { getAllComments } from "../api/comments";
import { getDatabase } from "../api/databases";
import { getPage } from "../api/pages";
import { searchAll } from "../api/search";
import type { NotionClient } from "../client";
import { transformDatabase } from "../transformers/database";
import { transformPage } from "../transformers/page";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_BLOCK_DEPTH = 10;

export interface IncrementalSyncOptions extends NotionSyncOptions {
  affectedPageIds?: string[];
  affectedDatabaseIds?: string[];
  onProgress?: (stats: {
    processed: number;
    skipped: number;
    errors: number;
  }) => void;
  onDatabasesDiscovered?: (databases: NotionDatabase[]) => Promise<void>;
  onPagesDiscovered?: (pages: NotionPage[]) => Promise<void>;
}

export async function* incrementalSync(
  client: NotionClient,
  context: NotionTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<NotionSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor: existingCursor,
    batchSize = DEFAULT_BATCH_SIZE,
    extractContent = true,
    extractComments = true,
    maxBlockDepth = DEFAULT_MAX_BLOCK_DEPTH,
    affectedPageIds,
    affectedDatabaseIds,
    onProgress,
    onDatabasesDiscovered,
    onPagesDiscovered,
  } = options;

  const lastSyncTime = existingCursor?.lastSyncTime;

  logger.info(
    {
      lastSyncTime: lastSyncTime
        ? new Date(lastSyncTime).toISOString()
        : undefined,
      affectedPageIds: affectedPageIds?.length,
      affectedDatabaseIds: affectedDatabaseIds?.length,
    },
    "Notion incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  const cursor: NotionSyncCursor = {
    lastSyncTime: Date.now(),
    lastEditedTime: existingCursor?.lastEditedTime,
  };

  const discoveredDatabases: NotionDatabase[] = [];
  const discoveredPages: NotionPage[] = [];

  if (affectedPageIds?.length) {
    for (const pageId of affectedPageIds) {
      try {
        const page = await getPage(client, pageId);
        if (!page) {
          skipped += 1;
          continue;
        }

        if (page.archived || page.in_trash) {
          documents.push(createPageDeleteMarker(context, page.id));
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

        if (page.parent.type === "workspace") {
          discoveredPages.push(page);
        }

        const document = await processPage({
          client,
          page,
          context,
          extractContent,
          extractComments,
          maxBlockDepth,
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
        logger.error({ error, pageId }, "Error processing affected page");
        errors += 1;
      }
    }
  }

  if (affectedDatabaseIds?.length) {
    for (const databaseId of affectedDatabaseIds) {
      try {
        const database = await getDatabase(client, databaseId);
        if (!database) {
          skipped += 1;
          continue;
        }

        if (database.archived || database.in_trash) {
          documents.push(createDatabaseDeleteMarker(context, database.id));
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

        discoveredDatabases.push(database);
        const document = await transformDatabase(database, context);
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
          { error, databaseId },
          "Error processing affected database"
        );
        errors += 1;
      }
    }
  }

  if (
    !(affectedPageIds?.length || affectedDatabaseIds?.length) &&
    lastSyncTime
  ) {
    for await (const item of searchAll(client, {
      sort: { direction: "descending", timestamp: "last_edited_time" },
    })) {
      const editedAt = new Date(item.last_edited_time).getTime();

      if (editedAt < lastSyncTime) {
        break;
      }

      if (item.archived || item.in_trash) {
        if (item.object === "page") {
          documents.push(createPageDeleteMarker(context, item.id));
        } else {
          documents.push(createDatabaseDeleteMarker(context, item.id));
        }
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
        let document: GenericDocument;

        if (item.object === "page") {
          const page = item as NotionPage;
          if (page.parent.type === "workspace") {
            discoveredPages.push(page);
          }
          document = await processPage({
            client,
            page,
            context,
            extractContent,
            extractComments,
            maxBlockDepth,
          });
        } else {
          const database = item as NotionDatabase;
          discoveredDatabases.push(database);
          document = await transformDatabase(database, context);
        }

        documents.push(document);
        processed += 1;

        cursor.lastEditedTime = item.last_edited_time;

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
          { error, itemId: item.id, type: item.object },
          "Error processing Notion item"
        );
        errors += 1;
      }
    }
  }

  if (onDatabasesDiscovered && discoveredDatabases.length > 0) {
    await onDatabasesDiscovered(discoveredDatabases);
  }

  if (onPagesDiscovered && discoveredPages.length > 0) {
    await onPagesDiscovered(discoveredPages);
  }

  logger.info(
    { processed, skipped, errors, documentsCount: documents.length },
    "Notion incremental sync complete"
  );

  if (documents.length > 0) {
    yield createBatch(documents, cursor, false, { processed, skipped, errors });
  }
}

interface ProcessPageOptions {
  client: NotionClient;
  page: NotionPage;
  context: NotionTransformContext;
  extractContent: boolean;
  extractComments: boolean;
  maxBlockDepth: number;
}

async function processPage(
  options: ProcessPageOptions
): Promise<GenericDocument> {
  const {
    client,
    page,
    context,
    extractContent,
    extractComments,
    maxBlockDepth,
  } = options;

  const blocks = extractContent
    ? await getAllBlockChildren(client, page.id, maxBlockDepth)
    : undefined;

  const comments = extractComments
    ? await getAllComments(client, { blockId: page.id })
    : undefined;

  return await transformPage(page, context, { blocks, comments });
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
