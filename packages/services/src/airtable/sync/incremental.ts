import type {
  AirtableSyncBatch,
  AirtableSyncCursor,
  AirtableTransformContext,
} from "@openbeam/types/services/connectors/airtable";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllBases } from "../api/bases";
import { listRecordComments } from "../api/comments";
import { listAllRecords } from "../api/records";
import type { AirtableTable } from "../api/tables";
import { listTables } from "../api/tables";
import type { AirtableClient } from "../client";
import { transformAirtableComment } from "../transformers/comment";
import { transformAirtableRecord } from "../transformers/record";
import { transformAirtableTable } from "../transformers/table";
import { airtableFullSync } from "./full";

type IncrementalSyncOptions = {
  cursor?: AirtableSyncCursor;
  batchSize?: number;
  includeBases?: string[];
  excludeBases?: string[];
  syncComments?: boolean;
};

type TableMeta = {
  baseId: string;
  baseName: string;
  tableId: string;
  tableName: string;
};

type CollectCommentsParams = {
  client: AirtableClient;
  context: AirtableTransformContext;
  recordId: string;
  meta: TableMeta;
};

async function collectComments(
  params: CollectCommentsParams,
  documents: GenericDocument[]
): Promise<void> {
  try {
    for await (const comments of listRecordComments(
      params.client,
      params.meta.baseId,
      params.recordId
    )) {
      for (const comment of comments) {
        documents.push(
          transformAirtableComment(comment, params.context, {
            ...params.meta,
            recordId: params.recordId,
          })
        );
      }
    }
  } catch (error) {
    logger.warn(
      { error, recordId: params.recordId },
      "Error fetching comments during incremental sync"
    );
  }
}

export async function* airtableIncrementalSync(
  client: AirtableClient,
  context: AirtableTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<AirtableSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* airtableFullSync(client, context, options);
    return;
  }

  const includeBases = options.includeBases ?? [];
  const excludeBases = options.excludeBases ?? [];
  const syncComments = options.syncComments ?? true;

  const sinceIso = new Date(cursor.lastSyncTime).toISOString();
  const filterFormula = `IS_AFTER(LAST_MODIFIED_TIME(), '${sinceIso}')`;

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const bases of listAllBases(client)) {
      for (const base of bases) {
        if (includeBases.length > 0 && !includeBases.includes(base.id)) {
          continue;
        }
        if (excludeBases.includes(base.id)) {
          continue;
        }

        let tables: AirtableTable[] = [];
        try {
          tables = await listTables(client, base.id);
        } catch (error) {
          logger.error(
            { error, baseId: base.id },
            "Error listing tables during incremental sync"
          );
          errors += 1;
          continue;
        }

        for (const table of tables) {
          try {
            documents.push(
              transformAirtableTable(table, context, {
                baseId: base.id,
                baseName: base.name,
              })
            );
            processed += 1;
          } catch (error) {
            logger.error(
              { error, tableId: table.id },
              "Error transforming Airtable table"
            );
            errors += 1;
          }

          const meta: TableMeta = {
            baseId: base.id,
            baseName: base.name,
            tableId: table.id,
            tableName: table.name,
          };

          for await (const records of listAllRecords(
            client,
            base.id,
            table.id,
            { filterByFormula: filterFormula }
          )) {
            for (const record of records) {
              try {
                documents.push(transformAirtableRecord(record, context, meta));
                processed += 1;
                const ts = new Date(record.createdTime).getTime();
                if (ts > latestModified) {
                  latestModified = ts;
                }
                if (syncComments) {
                  await collectComments(
                    { client, context, recordId: record.id, meta },
                    documents
                  );
                  processed = documents.length;
                }
              } catch (error) {
                logger.error(
                  { error, recordId: record.id },
                  "Error transforming Airtable record"
                );
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
      "Airtable incremental sync failed, falling back to full"
    );
    yield* airtableFullSync(client, context, options);
  }
}
