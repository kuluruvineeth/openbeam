import type {
  CodaSyncBatch,
  CodaSyncCursor,
  CodaTransformContext,
} from "@openbeam/types/services/connectors/coda";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listDocsUpdatedSince } from "../api/docs";
import { getPageContent, listAllPages } from "../api/pages";
import { listAllRows } from "../api/rows";
import { listAllTables, listColumns } from "../api/tables";
import type { CodaClient } from "../client";
import { transformCodaDoc } from "../transformers/doc";
import { transformCodaPage } from "../transformers/page";
import { transformCodaRow } from "../transformers/row";
import { transformCodaTable } from "../transformers/table";
import { codaFullSync } from "./full";

interface IncrementalSyncOptions {
  cursor?: CodaSyncCursor;
  batchSize?: number;
  syncTables?: boolean;
  syncRows?: boolean;
}

export async function* codaIncrementalSync(
  client: CodaClient,
  context: CodaTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<CodaSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = 50,
    syncTables = true,
    syncRows = true,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* codaFullSync(client, context, { batchSize, syncTables, syncRows });
    return;
  }

  const sinceTime = cursor.lastSyncTime;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestModified = sinceTime;

  try {
    for await (const docs of listDocsUpdatedSince(
      client,
      new Date(sinceTime).toISOString()
    )) {
      for (const doc of docs) {
        const docUpdatedAt = new Date(doc.updatedAt).getTime();

        try {
          documents.push(transformCodaDoc(doc, context));
          processed += 1;
          if (docUpdatedAt > latestModified) {
            latestModified = docUpdatedAt;
          }
        } catch (error) {
          logger.error({ error, docId: doc.id }, "Error transforming Coda doc");
          errors += 1;
        }

        try {
          for await (const pages of listAllPages(client, doc.id)) {
            for (const page of pages) {
              try {
                let content: string | undefined;
                try {
                  content = await getPageContent(client, doc.id, page.id);
                } catch {
                  logger.warn(
                    { docId: doc.id, pageId: page.id },
                    "Could not fetch page content"
                  );
                }
                documents.push(transformCodaPage(page, doc, context, content));
                processed += 1;
              } catch (error) {
                logger.error(
                  { error, docId: doc.id, pageId: page.id },
                  "Error transforming Coda page"
                );
                errors += 1;
              }
            }
          }
        } catch (error) {
          logger.error({ error, docId: doc.id }, "Error listing pages");
          errors += 1;
        }

        if (syncTables) {
          try {
            for await (const tables of listAllTables(client, doc.id)) {
              for (const table of tables) {
                try {
                  const columns = await listColumns(client, doc.id, table.id);
                  documents.push(
                    transformCodaTable(table, doc, columns, context)
                  );
                  processed += 1;
                } catch (error) {
                  logger.error(
                    { error, tableId: table.id },
                    "Error transforming Coda table"
                  );
                  errors += 1;
                }

                if (syncRows) {
                  try {
                    for await (const rows of listAllRows(
                      client,
                      doc.id,
                      table.id
                    )) {
                      for (const row of rows) {
                        try {
                          documents.push(
                            transformCodaRow(row, table, doc, context)
                          );
                          processed += 1;
                        } catch (error) {
                          logger.error(
                            { error, rowId: row.id },
                            "Error transforming Coda row"
                          );
                          errors += 1;
                        }
                      }
                    }
                  } catch (error) {
                    logger.error(
                      { error, tableId: table.id },
                      "Error listing rows"
                    );
                    errors += 1;
                  }
                }
              }
            }
          } catch (error) {
            logger.error({ error, docId: doc.id }, "Error listing tables");
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestModified,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped: 0, errors },
          };
          documents = [];
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Coda incremental sync failed, falling back to full"
    );
    yield* codaFullSync(client, context, { batchSize, syncTables, syncRows });
  }
}
