import type {
  OpsGenieSyncBatch,
  OpsGenieSyncCursor,
  OpsGenieSyncOptions,
  OpsGenieTransformContext,
} from "@openbeam/types/services/connectors/opsgenie";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAlerts } from "../api/alerts";
import { listIncidents } from "../api/incidents";
import { getOnCallParticipants, listSchedules } from "../api/schedules";
import { listServices } from "../api/services";
import type { OpsGenieClient } from "../client";
import { transformAlert } from "../transformers/alert";
import { transformIncident } from "../transformers/incident";
import { transformSchedule } from "../transformers/schedule";
import { transformService } from "../transformers/service";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

function buildSinceQuery(lookbackDays?: number): string {
  const days = lookbackDays ?? 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return `createdAt > ${since.getTime()}`;
}

export async function* opsgenieFullSync(
  client: OpsGenieClient,
  context: OpsGenieTransformContext,
  options: OpsGenieSyncOptions = {}
): AsyncGenerator<OpsGenieSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncServices = true,
    syncSchedules = true,
    lookbackDays,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncServices,
      syncSchedules,
      lookbackDays,
    },
    "OpsGenie full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: OpsGenieSyncCursor = {
    lastSyncTime: Date.now(),
  };

  let latestAlertUpdated: string | undefined;
  let latestIncidentUpdated: string | undefined;

  await onStageChange?.("Syncing alerts", state.processed);
  const alertQuery = buildSinceQuery(lookbackDays);

  for await (const alerts of listAlerts(client, {
    query: alertQuery,
    sort: "createdAt",
    order: "desc",
  })) {
    for (const alert of alerts) {
      try {
        await onStageChange?.(
          "Processing alerts",
          state.processed,
          alert.message
        );

        if (!latestAlertUpdated || alert.updatedAt > latestAlertUpdated) {
          latestAlertUpdated = alert.updatedAt;
        }

        state.documents.push(await transformAlert(alert, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastAlertUpdatedAt = latestAlertUpdated;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, alertId: alert.id },
          "Error processing OpsGenie alert"
        );
        state.errors += 1;
      }
    }
  }

  await onStageChange?.("Syncing incidents", state.processed);

  for await (const incidents of listIncidents(client, {
    sort: "createdAt",
    order: "desc",
  })) {
    for (const incident of incidents) {
      try {
        await onStageChange?.(
          "Processing incidents",
          state.processed,
          incident.message
        );

        if (
          !latestIncidentUpdated ||
          incident.updatedAt > latestIncidentUpdated
        ) {
          latestIncidentUpdated = incident.updatedAt;
        }

        state.documents.push(await transformIncident(incident, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastIncidentUpdatedAt = latestIncidentUpdated;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, incidentId: incident.id },
          "Error processing OpsGenie incident"
        );
        state.errors += 1;
      }
    }
  }

  if (syncServices) {
    await onStageChange?.("Syncing services", state.processed);

    for await (const services of listServices(client)) {
      for (const service of services) {
        try {
          await onStageChange?.(
            "Processing services",
            state.processed,
            service.name
          );
          state.documents.push(await transformService(service, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, serviceId: service.id },
            "Error processing OpsGenie service"
          );
          state.errors += 1;
        }
      }
    }
  }

  if (syncSchedules) {
    await onStageChange?.("Syncing schedules", state.processed);

    const schedules = await listSchedules(client);
    for (const schedule of schedules) {
      try {
        await onStageChange?.(
          "Processing schedules",
          state.processed,
          schedule.name
        );

        const onCall = await getOnCallParticipants(client, schedule.id);
        state.documents.push(
          await transformSchedule(schedule, context, onCall)
        );
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, scheduleId: schedule.id },
          "Error processing OpsGenie schedule"
        );
        state.errors += 1;
      }
    }
  }

  cursor.lastAlertUpdatedAt = latestAlertUpdated;
  cursor.lastIncidentUpdatedAt = latestIncidentUpdated;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "OpsGenie full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
