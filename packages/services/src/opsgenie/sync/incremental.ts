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
import { opsgenieFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* opsgenieIncrementalSync(
  client: OpsGenieClient,
  context: OpsGenieTransformContext,
  options: OpsGenieSyncOptions = {}
): AsyncGenerator<OpsGenieSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncServices = true,
    syncSchedules = true,
    onStageChange,
  } = options;

  if (!cursor?.lastSyncTime) {
    yield* opsgenieFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "OpsGenie incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestAlertUpdated = cursor.lastAlertUpdatedAt;
  let latestIncidentUpdated = cursor.lastIncidentUpdatedAt;

  const sinceTimestamp = cursor.lastSyncTime;
  const alertQuery = `updatedAt > ${sinceTimestamp}`;

  try {
    await onStageChange?.("Syncing updated alerts", processed);

    for await (const alerts of listAlerts(client, {
      query: alertQuery,
      sort: "updatedAt",
      order: "desc",
    })) {
      for (const alert of alerts) {
        try {
          if (!latestAlertUpdated || alert.updatedAt > latestAlertUpdated) {
            latestAlertUpdated = alert.updatedAt;
          }

          documents.push(await transformAlert(alert, context));
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(
              documents,
              {
                lastSyncTime: sinceTimestamp,
                lastAlertUpdatedAt: latestAlertUpdated,
                lastIncidentUpdatedAt: latestIncidentUpdated,
              },
              true,
              { processed, skipped: 0, errors }
            );
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, alertId: alert.id },
            "Error processing alert in incremental sync"
          );
          errors += 1;
        }
      }
    }

    await onStageChange?.("Syncing updated incidents", processed);

    for await (const incidents of listIncidents(client, {
      sort: "createdAt",
      order: "desc",
    })) {
      for (const incident of incidents) {
        const updatedMs = new Date(incident.updatedAt).getTime();
        if (updatedMs <= sinceTimestamp) {
          continue;
        }

        try {
          if (
            !latestIncidentUpdated ||
            incident.updatedAt > latestIncidentUpdated
          ) {
            latestIncidentUpdated = incident.updatedAt;
          }

          documents.push(await transformIncident(incident, context));
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(
              documents,
              {
                lastSyncTime: sinceTimestamp,
                lastAlertUpdatedAt: latestAlertUpdated,
                lastIncidentUpdatedAt: latestIncidentUpdated,
              },
              true,
              { processed, skipped: 0, errors }
            );
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, incidentId: incident.id },
            "Error processing incident in incremental sync"
          );
          errors += 1;
        }
      }
    }

    if (syncServices) {
      await onStageChange?.("Syncing services", processed);
      for await (const services of listServices(client)) {
        for (const service of services) {
          try {
            documents.push(await transformService(service, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, serviceId: service.id },
              "Error processing service"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncSchedules) {
      await onStageChange?.("Syncing schedules", processed);
      const schedules = await listSchedules(client);
      for (const schedule of schedules) {
        try {
          const onCall = await getOnCallParticipants(client, schedule.id);
          documents.push(await transformSchedule(schedule, context, onCall));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, scheduleId: schedule.id },
            "Error processing schedule"
          );
          errors += 1;
        }
      }
    }

    const newCursor: OpsGenieSyncCursor = {
      lastSyncTime: Date.now(),
      lastAlertUpdatedAt: latestAlertUpdated,
      lastIncidentUpdatedAt: latestIncidentUpdated,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "OpsGenie incremental sync failed, falling back to full"
    );
    yield* opsgenieFullSync(client, context, options);
  }
}
