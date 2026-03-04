import type {
  SamsaraPagination,
  SamsaraSyncBatch,
  SamsaraSyncCursor,
  SamsaraSyncOptions,
  SamsaraTransformContext,
} from "@openplane/types/services/connectors/samsara";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import type { SamsaraClient } from "../client";
import type { SamsaraAlert } from "../transformers/alert";
import { transformAlert } from "../transformers/alert";
import type { SamsaraDriver } from "../transformers/driver";
import { transformDriver } from "../transformers/driver";
import type { SamsaraVehicle } from "../transformers/vehicle";
import { transformVehicle } from "../transformers/vehicle";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PAGE_LIMIT = "512";

interface PaginatedResponse<T> {
  data: T[];
  pagination: SamsaraPagination;
}

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

async function* paginate<T>(
  client: SamsaraClient,
  path: string,
  params?: Record<string, string>
): AsyncGenerator<T[], void, undefined> {
  let cursor: string | undefined;

  do {
    const queryParams: Record<string, string> = {
      ...params,
      limit: DEFAULT_PAGE_LIMIT,
    };
    if (cursor) {
      queryParams.after = cursor;
    }

    const response = await client.get<PaginatedResponse<T>>(path, queryParams);
    yield response.data;

    cursor = response.pagination.hasNextPage
      ? response.pagination.endCursor
      : undefined;
  } while (cursor);
}

export async function* fullSync(
  client: SamsaraClient,
  context: SamsaraTransformContext,
  options: SamsaraSyncOptions = {}
): AsyncGenerator<SamsaraSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncAlerts = true,
    lookbackDays,
    onStageChange,
  } = options;

  logger.info(
    { connectorId: client.connectorId, syncAlerts, lookbackDays },
    "Samsara full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: SamsaraSyncCursor = {
    lastSyncTime: Date.now(),
  };

  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  await onStageChange?.("Syncing vehicles", state.processed);
  for await (const vehicles of paginate<SamsaraVehicle>(
    client,
    "/fleet/vehicles"
  )) {
    for (const vehicle of vehicles) {
      if (shouldSkip(vehicle.updatedAtTime, lookbackTime)) {
        state.skipped += 1;
        continue;
      }

      try {
        await onStageChange?.(
          "Processing vehicles",
          state.processed,
          vehicle.name
        );
        state.documents.push(await transformVehicle(vehicle, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, vehicleId: vehicle.id },
          "Error processing Samsara vehicle"
        );
        state.errors += 1;
      }
    }
  }

  await onStageChange?.("Syncing drivers", state.processed);
  for await (const drivers of paginate<SamsaraDriver>(
    client,
    "/fleet/drivers"
  )) {
    for (const driver of drivers) {
      if (shouldSkip(driver.updatedAtTime, lookbackTime)) {
        state.skipped += 1;
        continue;
      }

      try {
        await onStageChange?.(
          "Processing drivers",
          state.processed,
          driver.name
        );
        state.documents.push(await transformDriver(driver, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, driverId: driver.id },
          "Error processing Samsara driver"
        );
        state.errors += 1;
      }
    }
  }

  if (syncAlerts) {
    await onStageChange?.("Syncing alerts", state.processed);
    for await (const alerts of paginate<SamsaraAlert>(
      client,
      "/fleet/alerts"
    )) {
      for (const alert of alerts) {
        if (shouldSkip(alert.occurredAtTime, lookbackTime)) {
          state.skipped += 1;
          continue;
        }

        try {
          await onStageChange?.(
            "Processing alerts",
            state.processed,
            alert.conditionName
          );
          state.documents.push(await transformAlert(alert, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, alertId: alert.id },
            "Error processing Samsara alert"
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
    "Samsara full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}

function shouldSkip(
  updatedAt: string | undefined,
  lookbackTime: number | undefined
): boolean {
  if (!(lookbackTime && updatedAt)) {
    return false;
  }
  return new Date(updatedAt).getTime() < lookbackTime;
}
