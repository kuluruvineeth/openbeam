import type {
  SmartsheetSyncBatch,
  SmartsheetSyncCursor,
  SmartsheetSyncOptions,
  SmartsheetTransformContext,
} from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listDashboards } from "../api/dashboards";
import { listReports } from "../api/reports";
import { getSheetWithRows, listSheets } from "../api/sheets";
import { getWorkspace, listWorkspaces } from "../api/workspaces";
import type { SmartsheetClient } from "../client";
import { transformDashboard } from "../transformers/dashboard";
import { transformReport } from "../transformers/report";
import { transformRow } from "../transformers/row";
import { transformSheet } from "../transformers/sheet";
import { transformWorkspace } from "../transformers/workspace";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* smartsheetFullSync(
  client: SmartsheetClient,
  context: SmartsheetTransformContext,
  options: SmartsheetSyncOptions = {}
): AsyncGenerator<SmartsheetSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncReports = true,
    syncDashboards = true,
    syncWorkspaces = true,
    lookbackDays,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncReports,
      syncDashboards,
      syncWorkspaces,
      lookbackDays,
    },
    "Smartsheet full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: SmartsheetSyncCursor = {
    lastSyncTime: Date.now(),
  };

  const modifiedSince = lookbackDays
    ? new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  await onStageChange?.("Syncing sheets", state.processed);

  for await (const sheets of listSheets(client, { modifiedSince })) {
    for (const sheetSummary of sheets) {
      try {
        await onStageChange?.(
          "Processing sheet",
          state.processed,
          sheetSummary.name
        );

        const sheet = await getSheetWithRows(client, sheetSummary.id);
        state.documents.push(await transformSheet(sheet, context));
        state.processed += 1;

        if (sheet.rows?.length && sheet.columns?.length) {
          for (const row of sheet.rows) {
            try {
              state.documents.push(
                await transformRow({
                  row,
                  sheet: {
                    id: sheet.id,
                    name: sheet.name,
                    permalink: sheet.permalink,
                    columns: sheet.columns,
                  },
                  context,
                })
              );
              state.processed += 1;
            } catch (error) {
              logger.error(
                { error, rowId: row.id, sheetId: sheet.id },
                "Error processing Smartsheet row"
              );
              state.errors += 1;
            }
          }
        }

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, sheetId: sheetSummary.id },
          "Error processing Smartsheet sheet"
        );
        state.errors += 1;
      }
    }
  }

  if (syncWorkspaces) {
    await onStageChange?.("Syncing workspaces", state.processed);

    for await (const workspaces of listWorkspaces(client)) {
      for (const wsSummary of workspaces) {
        try {
          await onStageChange?.(
            "Processing workspace",
            state.processed,
            wsSummary.name
          );

          const ws = await getWorkspace(client, wsSummary.id);
          state.documents.push(await transformWorkspace(ws, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, workspaceId: wsSummary.id },
            "Error processing Smartsheet workspace"
          );
          state.errors += 1;
        }
      }
    }
  }

  if (syncReports) {
    await onStageChange?.("Syncing reports", state.processed);

    for await (const reports of listReports(client, { modifiedSince })) {
      for (const report of reports) {
        try {
          await onStageChange?.(
            "Processing report",
            state.processed,
            report.name
          );
          state.documents.push(await transformReport(report, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, reportId: report.id },
            "Error processing Smartsheet report"
          );
          state.errors += 1;
        }
      }
    }
  }

  if (syncDashboards) {
    await onStageChange?.("Syncing dashboards", state.processed);

    for await (const dashboards of listDashboards(client, { modifiedSince })) {
      for (const dashboard of dashboards) {
        try {
          await onStageChange?.(
            "Processing dashboard",
            state.processed,
            dashboard.name
          );
          state.documents.push(await transformDashboard(dashboard, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, dashboardId: dashboard.id },
            "Error processing Smartsheet dashboard"
          );
          state.errors += 1;
        }
      }
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Smartsheet full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
