import type {
  CodaSyncBatch,
  CodaSyncCursor,
  CodaTransformContext,
} from "@openbeam/types/services/connectors/coda";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllDocs } from "../api/docs";
import { getPageContent, listAllPages } from "../api/pages";
import { listAllRows } from "../api/rows";
import { listAllTables, listColumns } from "../api/tables";
import type { CodaClient } from "../client";
import { transformCodaDoc } from "../transformers/doc";
import { transformCodaPage } from "../transformers/page";
import { transformCodaRow } from "../transformers/row";
import { transformCodaTable } from "../transformers/table";

interface FullSyncOptions {
  batchSize?: number;
  syncTables?: boolean;
  syncRows?: boolean;
}

export async function* codaFullSync(
  client: CodaClient,
  context: CodaTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<CodaSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncTables = options.syncTables ?? true;
  const syncRows = options.syncRows ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const docs of listAllDocs(client)) {
    for (const doc of docs) {
      try {
        documents.push(transformCodaDoc(doc, context));
        processed += 1;
        latestModified = trackModified(doc.updatedAt, latestModified);
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
        logger.error({ error, docId: doc.id }, "Error listing pages for doc");
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
                  { error, docId: doc.id, tableId: table.id },
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

                    if (documents.length >= batchSize) {
                      yield makeBatch(
                        documents,
                        { processed, skipped: 0, errors },
                        true,
                        latestModified
                      );
                      documents = [];
                    }
                  }
                } catch (error) {
                  logger.error(
                    { error, docId: doc.id, tableId: table.id },
                    "Error listing rows for table"
                  );
                  errors += 1;
                }
              }
            }
          }
        } catch (error) {
          logger.error(
            { error, docId: doc.id },
            "Error listing tables for doc"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped: 0, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  const cursor: CodaSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped: 0, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): CodaSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(updateTime: string, current: number): number {
  const ts = new Date(updateTime).getTime();
  return ts > current ? ts : current;
}
