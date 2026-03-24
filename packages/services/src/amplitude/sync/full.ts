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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* amplitudeFullSync(
  client: AmplitudeClient,
  context: AmplitudeTransformContext,
  options: AmplitudeSyncOptions = {}
): AsyncGenerator<AmplitudeSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncCohorts = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncCohorts,
    },
    "Amplitude full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: AmplitudeSyncCursor = {
    lastSyncTime: Date.now(),
  };

  let latestChartModified: string | undefined;
  let latestDashboardModified: string | undefined;

  await onStageChange?.("Syncing charts", state.processed);
  const charts = await listCharts(client);

  for (const chart of charts) {
    try {
      await onStageChange?.("Processing charts", state.processed, chart.name);

      if (
        chart.lastModified &&
        (!latestChartModified || chart.lastModified > latestChartModified)
      ) {
        latestChartModified = chart.lastModified;
      }

      state.documents.push(await transformChart(chart, context));
      state.processed += 1;

      if (state.documents.length >= batchSize) {
        cursor.lastChartModified = latestChartModified;
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    } catch (error) {
      logger.error(
        { error, chartId: chart.id },
        "Error processing Amplitude chart"
      );
      state.errors += 1;
    }
  }

  await onStageChange?.("Syncing dashboards", state.processed);
  const dashboards = await listDashboards(client);

  for (const dashboard of dashboards) {
    try {
      await onStageChange?.(
        "Processing dashboards",
        state.processed,
        dashboard.name
      );

      if (
        dashboard.lastModified &&
        (!latestDashboardModified ||
          dashboard.lastModified > latestDashboardModified)
      ) {
        latestDashboardModified = dashboard.lastModified;
      }

      state.documents.push(await transformDashboard(dashboard, context));
      state.processed += 1;

      if (state.documents.length >= batchSize) {
        cursor.lastDashboardModified = latestDashboardModified;
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    } catch (error) {
      logger.error(
        { error, dashboardId: dashboard.id },
        "Error processing Amplitude dashboard"
      );
      state.errors += 1;
    }
  }

  if (syncCohorts) {
    await onStageChange?.("Syncing cohorts", state.processed);
    const cohorts = await listCohorts(client);

    for (const cohort of cohorts) {
      try {
        await onStageChange?.(
          "Processing cohorts",
          state.processed,
          cohort.name
        );

        state.documents.push(await transformCohort(cohort, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, cohortId: cohort.id },
          "Error processing Amplitude cohort"
        );
        state.errors += 1;
      }
    }
  }

  cursor.lastChartModified = latestChartModified;
  cursor.lastDashboardModified = latestDashboardModified;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Amplitude full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
