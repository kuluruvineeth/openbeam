import type {
  DatadogSyncBatch,
  DatadogSyncCursor,
  DatadogSyncOptions,
  DatadogTransformContext,
} from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import {
  type DatadogWidget,
  getDashboard,
  listDashboards,
} from "../api/dashboards";
import { listIncidents } from "../api/incidents";
import { listMonitors } from "../api/monitors";
import { listNotebooks } from "../api/notebooks";
import { listServices } from "../api/services";
import { listSlos } from "../api/slos";
import type { DatadogClient } from "../client";
import { transformDashboard } from "../transformers/dashboard";
import { transformIncident } from "../transformers/incident";
import { transformMonitor } from "../transformers/monitor";
import { transformNotebook } from "../transformers/notebook";
import { transformService } from "../transformers/service";
import { transformSlo } from "../transformers/slo";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

interface FlushOptions {
  state: SyncState;
  cursor: DatadogSyncCursor;
  batchSize: number;
}

function* flushIfNeeded(
  opts: FlushOptions
): Generator<DatadogSyncBatch<GenericDocument>> {
  if (opts.state.documents.length >= opts.batchSize) {
    yield createSyncBatch(opts.state.documents, opts.cursor, true, opts.state);
    opts.state.documents = [];
  }
}

async function syncMonitors(
  client: DatadogClient,
  context: DatadogTransformContext,
  state: SyncState,
  onStageChange: DatadogSyncOptions["onStageChange"]
): Promise<number> {
  let latestModified = 0;
  await onStageChange?.("Syncing monitors", state.processed);

  for await (const monitors of listMonitors(client)) {
    for (const monitor of monitors) {
      try {
        await onStageChange?.(
          "Processing monitors",
          state.processed,
          monitor.name
        );
        const modifiedMs = new Date(monitor.modified).getTime();
        if (modifiedMs > latestModified) {
          latestModified = modifiedMs;
        }
        state.documents.push(await transformMonitor(monitor, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, monitorId: monitor.id },
          "Error processing Datadog monitor"
        );
        state.errors += 1;
      }
    }
  }
  return latestModified;
}

async function syncDashboardsStage(
  client: DatadogClient,
  context: DatadogTransformContext,
  state: SyncState,
  onStageChange: DatadogSyncOptions["onStageChange"]
): Promise<number> {
  let latestModified = 0;
  await onStageChange?.("Syncing dashboards", state.processed);

  for await (const dashboards of listDashboards(client)) {
    for (const dashboard of dashboards) {
      try {
        await onStageChange?.(
          "Processing dashboards",
          state.processed,
          dashboard.title
        );
        const modifiedMs = new Date(dashboard.modified_at).getTime();
        if (modifiedMs > latestModified) {
          latestModified = modifiedMs;
        }

        let widgets: DatadogWidget[] | undefined;
        try {
          const detail = await getDashboard(client, dashboard.id);
          widgets = detail.widgets;
        } catch {
          // Proceed without widget detail
        }

        state.documents.push(
          await transformDashboard(dashboard, context, widgets)
        );
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, dashboardId: dashboard.id },
          "Error processing Datadog dashboard"
        );
        state.errors += 1;
      }
    }
  }
  return latestModified;
}

async function syncIncidentsStage(
  client: DatadogClient,
  context: DatadogTransformContext,
  state: SyncState,
  onStageChange: DatadogSyncOptions["onStageChange"]
): Promise<void> {
  await onStageChange?.("Syncing incidents", state.processed);

  for await (const { incidents, users } of listIncidents(client)) {
    for (const incident of incidents) {
      try {
        await onStageChange?.(
          "Processing incidents",
          state.processed,
          incident.attributes.title
        );
        const commanderData = incident.relationships?.commander_user?.data;
        const commanderName = commanderData
          ? users.get(commanderData.id)
          : undefined;
        state.documents.push(
          await transformIncident(incident, context, commanderName)
        );
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, incidentId: incident.id },
          "Error processing Datadog incident"
        );
        state.errors += 1;
      }
    }
  }
}

async function syncServicesStage(
  client: DatadogClient,
  context: DatadogTransformContext,
  state: SyncState,
  onStageChange: DatadogSyncOptions["onStageChange"]
): Promise<void> {
  await onStageChange?.("Syncing service catalog", state.processed);

  for await (const services of listServices(client)) {
    for (const service of services) {
      try {
        const name = service.attributes.schema["dd-service"];
        await onStageChange?.("Processing services", state.processed, name);
        state.documents.push(await transformService(service, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, serviceId: service.id },
          "Error processing Datadog service"
        );
        state.errors += 1;
      }
    }
  }
}

async function syncNotebooksStage(
  client: DatadogClient,
  context: DatadogTransformContext,
  state: SyncState,
  onStageChange: DatadogSyncOptions["onStageChange"]
): Promise<void> {
  await onStageChange?.("Syncing notebooks", state.processed);

  for await (const notebooks of listNotebooks(client)) {
    for (const notebook of notebooks) {
      try {
        await onStageChange?.(
          "Processing notebooks",
          state.processed,
          notebook.attributes.name
        );
        state.documents.push(await transformNotebook(notebook, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, notebookId: notebook.id },
          "Error processing Datadog notebook"
        );
        state.errors += 1;
      }
    }
  }
}

async function syncSlosStage(
  client: DatadogClient,
  context: DatadogTransformContext,
  state: SyncState,
  onStageChange: DatadogSyncOptions["onStageChange"]
): Promise<void> {
  await onStageChange?.("Syncing SLOs", state.processed);

  for await (const slos of listSlos(client)) {
    for (const slo of slos) {
      try {
        await onStageChange?.("Processing SLOs", state.processed, slo.name);
        state.documents.push(await transformSlo(slo, context));
        state.processed += 1;
      } catch (error) {
        logger.error({ error, sloId: slo.id }, "Error processing Datadog SLO");
        state.errors += 1;
      }
    }
  }
}

export async function* datadogFullSync(
  client: DatadogClient,
  context: DatadogTransformContext,
  options: DatadogSyncOptions = {}
): AsyncGenerator<DatadogSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncDashboards = true,
    syncIncidents = true,
    syncServices = true,
    syncNotebooks = true,
    syncSlos = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncDashboards,
      syncIncidents,
      syncServices,
      syncNotebooks,
      syncSlos,
    },
    "Datadog full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };
  const cursor: DatadogSyncCursor = { lastSyncTime: Date.now() };
  const flushOpts: FlushOptions = { state, cursor, batchSize };

  cursor.lastMonitorModified = await syncMonitors(
    client,
    context,
    state,
    onStageChange
  );
  yield* flushIfNeeded(flushOpts);

  if (syncDashboards) {
    cursor.lastDashboardModified = await syncDashboardsStage(
      client,
      context,
      state,
      onStageChange
    );
    yield* flushIfNeeded(flushOpts);
  }

  if (syncIncidents) {
    await syncIncidentsStage(client, context, state, onStageChange);
    yield* flushIfNeeded(flushOpts);
  }

  if (syncServices) {
    await syncServicesStage(client, context, state, onStageChange);
    yield* flushIfNeeded(flushOpts);
  }

  if (syncNotebooks) {
    await syncNotebooksStage(client, context, state, onStageChange);
    yield* flushIfNeeded(flushOpts);
  }

  if (syncSlos) {
    await syncSlosStage(client, context, state, onStageChange);
    yield* flushIfNeeded(flushOpts);
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Datadog full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
