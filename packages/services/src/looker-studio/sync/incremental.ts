import type {
  LookerStudioSyncBatch,
  LookerStudioSyncCursor,
  LookerStudioTransformContext,
} from "@openbeam/types/services/connectors/looker-studio";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllDataSources } from "../api/data-sources";
import { listAllReports } from "../api/reports";
import type { LookerStudioClient } from "../client";
import { transformDataSource } from "../transformers/data-source";
import { transformReport } from "../transformers/report";
import { lookerStudioFullSync } from "./full";

type SyncOptions = {
  cursor?: LookerStudioSyncCursor;
  batchSize?: number;
};

export async function* lookerStudioIncrementalSync(
  client: LookerStudioClient,
  context: LookerStudioTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<LookerStudioSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 50 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* lookerStudioFullSync(client, context, { batchSize });
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const reports of listAllReports(client, {
      modifiedAfter: sinceDate,
    })) {
      for (const report of reports) {
        try {
          documents.push(transformReport(report, context));
          processed += 1;
          const ts = new Date(report.modifiedTime).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, reportId: report.id },
            "Error transforming Looker Studio report in incremental sync"
          );
          errors += 1;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestModified,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    for await (const dataSources of listAllDataSources(client, {
      modifiedAfter: sinceDate,
    })) {
      for (const ds of dataSources) {
        try {
          documents.push(transformDataSource(ds, context));
          processed += 1;
          const ts = new Date(ds.modifiedTime).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, dataSourceId: ds.id },
            "Error transforming Looker Studio data source in incremental sync"
          );
          errors += 1;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestModified,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
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
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Looker Studio incremental sync failed, falling back to full"
    );
    yield* lookerStudioFullSync(client, context, { batchSize });
  }
}
