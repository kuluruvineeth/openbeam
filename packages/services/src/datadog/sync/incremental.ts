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
import { datadogFullSync } from "./full";
import { createSyncBatch } from "./utils";

interface IncrementalState {
  documents: GenericDocument[];
  processed: number;
  errors: number;
  latestMonitorModified: number;
  latestDashboardModified: number;
}

interface SyncStageParams {
  client: DatadogClient;
  context: DatadogTransformContext;
  state: IncrementalState;
  onStageChange: DatadogSyncOptions["onStageChange"];
}

async function syncUpdatedMonitors(
  params: SyncStageParams & { sinceTimestamp: number }
): Promise<void> {
  const { client, context, state, sinceTimestamp, onStageChange } = params;
  await onStageChange?.("Syncing updated monitors", state.processed);

  for await (const monitors of listMonitors(client)) {
    for (const monitor of monitors) {
      const modifiedMs = new Date(monitor.modified).getTime();
      if (modifiedMs <= sinceTimestamp) {
        continue;
      }

      try {
        if (modifiedMs > state.latestMonitorModified) {
          state.latestMonitorModified = modifiedMs;
        }
        state.documents.push(await transformMonitor(monitor, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, monitorId: monitor.id },
          "Error processing monitor in incremental sync"
        );
        state.errors += 1;
      }
    }
  }
}

async function syncUpdatedDashboards(
  params: SyncStageParams & { sinceTimestamp: number }
): Promise<void> {
  const { client, context, state, sinceTimestamp, onStageChange } = params;
  await onStageChange?.("Syncing updated dashboards", state.processed);

  for await (const dashboards of listDashboards(client)) {
    for (const dashboard of dashboards) {
      const modifiedMs = new Date(dashboard.modified_at).getTime();
      if (modifiedMs <= sinceTimestamp) {
        continue;
      }

      try {
        if (modifiedMs > state.latestDashboardModified) {
          state.latestDashboardModified = modifiedMs;
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
          "Error processing dashboard in incremental sync"
        );
        state.errors += 1;
      }
    }
  }
}

async function syncUpdatedIncidents(
  params: SyncStageParams & { sinceTimestamp: number }
): Promise<void> {
  const { client, context, state, sinceTimestamp, onStageChange } = params;
  await onStageChange?.("Syncing updated incidents", state.processed);

  for await (const { incidents, users } of listIncidents(client)) {
    for (const incident of incidents) {
      const modifiedMs = new Date(incident.attributes.modified).getTime();
      if (modifiedMs <= sinceTimestamp) {
        continue;
      }

      try {
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
          "Error processing incident in incremental sync"
        );
        state.errors += 1;
      }
    }
  }
}

interface ResourceSyncParams extends SyncStageParams {
  syncServices: boolean;
  syncNotebooks: boolean;
  syncSlos: boolean;
}

async function syncResourceEntities(params: ResourceSyncParams): Promise<void> {
  const {
    client,
    context,
    state,
    syncServices,
    syncNotebooks,
    syncSlos,
    onStageChange,
  } = params;

  if (syncServices) {
    await onStageChange?.("Syncing services", state.processed);
    for await (const services of listServices(client)) {
      for (const service of services) {
        try {
          state.documents.push(await transformService(service, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, serviceId: service.id },
            "Error processing service"
          );
          state.errors += 1;
        }
      }
    }
  }

  if (syncNotebooks) {
    await onStageChange?.("Syncing notebooks", state.processed);
    for await (const notebooks of listNotebooks(client)) {
      for (const notebook of notebooks) {
        try {
          state.documents.push(await transformNotebook(notebook, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, notebookId: notebook.id },
            "Error processing notebook"
          );
          state.errors += 1;
        }
      }
    }
  }

  if (syncSlos) {
    await onStageChange?.("Syncing SLOs", state.processed);
    for await (const slos of listSlos(client)) {
      for (const slo of slos) {
        try {
          state.documents.push(await transformSlo(slo, context));
          state.processed += 1;
        } catch (error) {
          logger.error({ error, sloId: slo.id }, "Error processing SLO");
          state.errors += 1;
        }
      }
    }
  }
}

export async function* datadogIncrementalSync(
  client: DatadogClient,
  context: DatadogTransformContext,
  options: DatadogSyncOptions = {}
): AsyncGenerator<DatadogSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    syncDashboards = true,
    syncIncidents = true,
    syncServices = true,
    syncNotebooks = true,
    syncSlos = true,
    onStageChange,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* datadogFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Datadog incremental sync started"
  );

  const sinceTimestamp = cursor.lastSyncTime;
  const state: IncrementalState = {
    documents: [],
    processed: 0,
    errors: 0,
    latestMonitorModified: cursor.lastMonitorModified ?? 0,
    latestDashboardModified: cursor.lastDashboardModified ?? 0,
  };
  const base = { client, context, state, onStageChange };

  try {
    await syncUpdatedMonitors({ ...base, sinceTimestamp });

    if (syncDashboards) {
      await syncUpdatedDashboards({ ...base, sinceTimestamp });
    }

    if (syncIncidents) {
      await syncUpdatedIncidents({ ...base, sinceTimestamp });
    }

    await syncResourceEntities({
      ...base,
      syncServices,
      syncNotebooks,
      syncSlos,
    });

    const newCursor: DatadogSyncCursor = {
      lastSyncTime: Date.now(),
      lastMonitorModified: state.latestMonitorModified,
      lastDashboardModified: state.latestDashboardModified,
    };

    yield createSyncBatch(state.documents, newCursor, false, {
      processed: state.processed,
      skipped: 0,
      errors: state.errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Datadog incremental sync failed, falling back to full"
    );
    yield* datadogFullSync(client, context, options);
  }
}
