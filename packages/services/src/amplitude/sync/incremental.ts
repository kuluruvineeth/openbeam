import type {
  AmplitudeSyncBatch,
  AmplitudeSyncCursor,
  AmplitudeSyncOptions,
  AmplitudeTransformContext,
} from "@openbeam/types/services/connectors/amplitude";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listCharts } from "../api/charts";
import { listCohorts } from "../api/cohorts";
import { listDashboards } from "../api/dashboards";
import type { AmplitudeClient } from "../client";
import { transformChart } from "../transformers/chart";
import { transformCohort } from "../transformers/cohort";
import { transformDashboard } from "../transformers/dashboard";
import { amplitudeFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* amplitudeIncrementalSync(
  client: AmplitudeClient,
  context: AmplitudeTransformContext,
  options: AmplitudeSyncOptions = {}
): AsyncGenerator<AmplitudeSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncCohorts = true,
    onStageChange,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* amplitudeFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Amplitude incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestChartModified = cursor.lastChartModified;
  let latestDashboardModified = cursor.lastDashboardModified;

  const sinceTimestamp = cursor.lastSyncTime;

  try {
    await onStageChange?.("Syncing updated charts", processed);
    const charts = await listCharts(client);

    for (const chart of charts) {
      if (chart.lastModified) {
        const modifiedMs = new Date(chart.lastModified).getTime();
        if (modifiedMs <= sinceTimestamp) {
          continue;
        }
      }

      try {
        if (
          chart.lastModified &&
          (!latestChartModified || chart.lastModified > latestChartModified)
        ) {
          latestChartModified = chart.lastModified;
        }

        documents.push(await transformChart(chart, context));
        processed += 1;

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: sinceTimestamp,
              lastChartModified: latestChartModified,
              lastDashboardModified: latestDashboardModified,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      } catch (error) {
        logger.error(
          { error, chartId: chart.id },
          "Error processing chart in incremental sync"
        );
        errors += 1;
      }
    }

    await onStageChange?.("Syncing updated dashboards", processed);
    const dashboards = await listDashboards(client);

    for (const dashboard of dashboards) {
      if (dashboard.lastModified) {
        const modifiedMs = new Date(dashboard.lastModified).getTime();
        if (modifiedMs <= sinceTimestamp) {
          continue;
        }
      }

      try {
        if (
          dashboard.lastModified &&
          (!latestDashboardModified ||
            dashboard.lastModified > latestDashboardModified)
        ) {
          latestDashboardModified = dashboard.lastModified;
        }

        documents.push(await transformDashboard(dashboard, context));
        processed += 1;

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: sinceTimestamp,
              lastChartModified: latestChartModified,
              lastDashboardModified: latestDashboardModified,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      } catch (error) {
        logger.error(
          { error, dashboardId: dashboard.id },
          "Error processing dashboard in incremental sync"
        );
        errors += 1;
      }
    }

    if (syncCohorts) {
      await onStageChange?.("Syncing cohorts", processed);
      const cohorts = await listCohorts(client);

      for (const cohort of cohorts) {
        if (cohort.lastModified) {
          const modifiedMs = new Date(cohort.lastModified).getTime();
          if (modifiedMs <= sinceTimestamp) {
            continue;
          }
        }

        try {
          documents.push(await transformCohort(cohort, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, cohortId: cohort.id },
            "Error processing cohort"
          );
          errors += 1;
        }
      }
    }

    const newCursor: AmplitudeSyncCursor = {
      lastSyncTime: Date.now(),
      lastChartModified: latestChartModified,
      lastDashboardModified: latestDashboardModified,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Amplitude incremental sync failed, falling back to full"
    );
    yield* amplitudeFullSync(client, context, options);
  }
}
