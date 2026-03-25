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

export async function* lookerStudioFullSync(
  client: LookerStudioClient,
  context: LookerStudioTransformContext,
  options: { batchSize?: number } = {}
): AsyncGenerator<LookerStudioSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const reports of listAllReports(client)) {
    for (const report of reports) {
      try {
        documents.push(transformReport(report, context));
        processed += 1;
        latestModified = trackModified(report.modifiedTime, latestModified);
      } catch (error) {
        logger.error(
          { error, reportId: report.id },
          "Error transforming Looker Studio report"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  for await (const dataSources of listAllDataSources(client)) {
    for (const ds of dataSources) {
      try {
        documents.push(transformDataSource(ds, context));
        processed += 1;
        latestModified = trackModified(ds.modifiedTime, latestModified);
      } catch (error) {
        logger.error(
          { error, dataSourceId: ds.id },
          "Error transforming Looker Studio data source"
        );
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  const cursor: LookerStudioSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): LookerStudioSyncBatch<GenericDocument> {
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

function trackModified(modifiedTime: string, current: number): number {
  const ts = new Date(modifiedTime).getTime();
  return ts > current ? ts : current;
}
