import type {
  AirtableSyncBatch,
  AirtableSyncCursor,
  AirtableTransformContext,
} from "@openbeam/types/services/connectors/airtable";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { AirtableBase } from "../api/bases";
import { listAllBases } from "../api/bases";
import { listRecordComments } from "../api/comments";
import type { AirtableRecord } from "../api/records";
import { listAllRecords } from "../api/records";
import type { AirtableTable } from "../api/tables";
import { listTables } from "../api/tables";
import type { AirtableClient } from "../client";
import { transformAirtableComment } from "../transformers/comment";
import { transformAirtableRecord } from "../transformers/record";
import { transformAirtableTable } from "../transformers/table";

type FullSyncOptions = {
  batchSize?: number;
  includeBases?: string[];
  excludeBases?: string[];
  syncComments?: boolean;
};

type SyncState = {
  documents: GenericDocument[];
  processed: number;
  errors: number;
  latestModified: number;
};

type SyncEnv = {
  client: AirtableClient;
  context: AirtableTransformContext;
};

type TableMeta = {
  baseId: string;
  baseName: string;
  tableId: string;
  tableName: string;
};

async function collectRecordComments(
  env: SyncEnv,
  record: AirtableRecord,
  params: { meta: TableMeta; state: SyncState }
): Promise<void> {
  try {
    for await (const comments of listRecordComments(
      env.client,
      params.meta.baseId,
      record.id
    )) {
      for (const comment of comments) {
        params.state.documents.push(
          transformAirtableComment(comment, env.context, {
            ...params.meta,
            recordId: record.id,
          })
        );
        params.state.processed += 1;
        const commentTs = new Date(
          comment.lastUpdatedTime ?? comment.createdTime
        ).getTime();
        if (commentTs > params.state.latestModified) {
          params.state.latestModified = commentTs;
        }
      }
    }
  } catch (error) {
    logger.warn(
      { error, recordId: record.id },
      "Error fetching comments for Airtable record"
    );
  }
}

type SyncTableParams = {
  base: AirtableBase;
  table: AirtableTable;
  state: SyncState;
  syncComments: boolean;
  batchSize: number;
};

async function* syncBaseTable(
  env: SyncEnv,
  params: SyncTableParams
): AsyncGenerator<AirtableSyncBatch<GenericDocument>, void, undefined> {
  const { base, table, state, syncComments, batchSize } = params;

  try {
    state.documents.push(
      transformAirtableTable(table, env.context, {
        baseId: base.id,
        baseName: base.name,
      })
    );
    state.processed += 1;
  } catch (error) {
    logger.error(
      { error, tableId: table.id },
      "Error transforming Airtable table"
    );
    state.errors += 1;
  }

  const meta: TableMeta = {
    baseId: base.id,
    baseName: base.name,
    tableId: table.id,
    tableName: table.name,
  };

  for await (const records of listAllRecords(env.client, base.id, table.id)) {
    for (const record of records) {
      try {
        state.documents.push(
          transformAirtableRecord(record, env.context, meta)
        );
        state.processed += 1;
        const ts = new Date(record.createdTime).getTime();
        if (ts > state.latestModified) {
          state.latestModified = ts;
        }
        if (syncComments) {
          await collectRecordComments(env, record, { meta, state });
        }
      } catch (error) {
        logger.error(
          { error, recordId: record.id },
          "Error transforming Airtable record"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }
}

export async function* airtableFullSync(
  client: AirtableClient,
  context: AirtableTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<AirtableSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const includeBases = options.includeBases ?? [];
  const excludeBases = options.excludeBases ?? [];
  const syncComments = options.syncComments ?? true;

  const env: SyncEnv = { client, context };
  const state: SyncState = {
    documents: [],
    processed: 0,
    errors: 0,
    latestModified: 0,
  };

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
          "Error listing tables for Airtable base"
        );
        state.errors += 1;
        continue;
      }

      for (const table of tables) {
        yield* syncBaseTable(env, {
          base,
          table,
          state,
          syncComments,
          batchSize,
        });

        if (state.documents.length >= batchSize) {
          yield makeBatch(state, true);
          state.documents = [];
        }
      }
    }
  }

  const cursor: AirtableSyncCursor = {
    lastSyncTime: state.latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: state.documents,
    cursor,
    hasMore: false,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}

function makeBatch(
  state: SyncState,
  hasMore: boolean
): AirtableSyncBatch<GenericDocument> {
  return {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}
