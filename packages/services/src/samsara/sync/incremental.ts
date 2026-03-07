import type {
  SamsaraPagination,
  SamsaraSyncBatch,
  SamsaraSyncCursor,
  SamsaraSyncOptions,
  SamsaraTransformContext,
} from "@openbeam/types/services/connectors/samsara";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { SamsaraClient } from "../client";
import type { SamsaraVehicle } from "../transformers/vehicle";
import { transformVehicle } from "../transformers/vehicle";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface FeedResponse<T> {
  data: T[];
  pagination: SamsaraPagination;
}

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* incrementalSync(
  client: SamsaraClient,
  context: SamsaraTransformContext,
  options: SamsaraSyncOptions = {}
): AsyncGenerator<SamsaraSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor: prevCursor,
    batchSize = DEFAULT_BATCH_SIZE,
    onStageChange,
  } = options;

  if (!prevCursor?.vehicleFeedCursor) {
    logger.warn("No feed cursor available, skipping incremental sync");
    return;
  }

  logger.info(
    { connectorId: client.connectorId },
    "Samsara incremental sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: SamsaraSyncCursor = {
    ...prevCursor,
    lastSyncTime: Date.now(),
  };

  await onStageChange?.("Fetching vehicle feed", state.processed);
  let feedCursor = prevCursor.vehicleFeedCursor;
  let hasMore = true;

  while (hasMore) {
    const response = await client.get<FeedResponse<SamsaraVehicle>>(
      "/fleet/vehicles/stats/feed",
      { after: feedCursor }
    );

    for (const vehicle of response.data) {
      try {
        await onStageChange?.(
          "Processing vehicle updates",
          state.processed,
          vehicle.name
        );
        state.documents.push(await transformVehicle(vehicle, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.vehicleFeedCursor = response.pagination.endCursor;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, vehicleId: vehicle.id },
          "Error processing vehicle feed update"
        );
        state.errors += 1;
      }
    }

    feedCursor = response.pagination.endCursor;
    hasMore = response.pagination.hasNextPage;
  }

  cursor.vehicleFeedCursor = feedCursor;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Samsara incremental sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
