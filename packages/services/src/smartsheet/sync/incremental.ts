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
import { smartsheetFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* smartsheetIncrementalSync(
  client: SmartsheetClient,
  context: SmartsheetTransformContext,
  options: SmartsheetSyncOptions = {}
): AsyncGenerator<SmartsheetSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncReports = true,
    syncDashboards = true,
    syncWorkspaces = true,
    onStageChange,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* smartsheetFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Smartsheet incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const modifiedSince = new Date(cursor.lastSyncTime).toISOString();

  try {
    await onStageChange?.("Syncing updated sheets", processed);

    for await (const sheets of listSheets(client, { modifiedSince })) {
      for (const sheetSummary of sheets) {
        try {
          const sheet = await getSheetWithRows(client, sheetSummary.id);
          documents.push(await transformSheet(sheet, context));
          processed += 1;

          if (sheet.rows?.length && sheet.columns?.length) {
            for (const row of sheet.rows) {
              try {
                documents.push(
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
                processed += 1;
              } catch (error) {
                logger.error(
                  { error, rowId: row.id },
                  "Error processing row in incremental sync"
                );
                errors += 1;
              }
            }
          }

          if (documents.length >= batchSize) {
            yield createSyncBatch(
              documents,
              { lastSyncTime: cursor.lastSyncTime },
              true,
              { processed, skipped: 0, errors }
            );
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, sheetId: sheetSummary.id },
            "Error processing sheet in incremental sync"
          );
          errors += 1;
        }
      }
    }

    if (syncWorkspaces) {
      await onStageChange?.("Syncing workspaces", processed);
      for await (const workspaces of listWorkspaces(client)) {
        for (const wsSummary of workspaces) {
          try {
            const ws = await getWorkspace(client, wsSummary.id);
            documents.push(await transformWorkspace(ws, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, workspaceId: wsSummary.id },
              "Error processing workspace"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncReports) {
      await onStageChange?.("Syncing updated reports", processed);
      for await (const reports of listReports(client, { modifiedSince })) {
        for (const report of reports) {
          try {
            documents.push(await transformReport(report, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, reportId: report.id },
              "Error processing report"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncDashboards) {
      await onStageChange?.("Syncing updated dashboards", processed);
      for await (const dashboards of listDashboards(client, {
        modifiedSince,
      })) {
        for (const dashboard of dashboards) {
          try {
            documents.push(await transformDashboard(dashboard, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, dashboardId: dashboard.id },
              "Error processing dashboard"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: SmartsheetSyncCursor = {
      lastSyncTime: Date.now(),
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Smartsheet incremental sync failed, falling back to full"
    );
    yield* smartsheetFullSync(client, context, options);
  }
}
