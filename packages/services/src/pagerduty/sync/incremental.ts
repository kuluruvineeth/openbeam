import type {
  PagerDutySyncBatch,
  PagerDutySyncCursor,
  PagerDutySyncOptions,
  PagerDutyTransformContext,
} from "@openbeam/types/services/connectors/pagerduty";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { PagerDutyClient } from "../client";
import type { PagerDutyIncident } from "../transformers/incident";
import { transformIncident } from "../transformers/incident";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PAGE_LIMIT = 100;
const MAX_PAGINATION_OFFSET = 9900;

interface PaginatedIncidentsResponse {
  incidents: PagerDutyIncident[];
  limit: number;
  offset: number;
  total: number | null;
  more: boolean;
}

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* incrementalSync(
  client: PagerDutyClient,
  context: PagerDutyTransformContext,
  options: PagerDutySyncOptions = {}
): AsyncGenerator<PagerDutySyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor: prevCursor,
    batchSize = DEFAULT_BATCH_SIZE,
    onStageChange,
  } = options;

  if (!prevCursor?.lastSyncTime) {
    logger.warn("No previous cursor, skipping incremental sync");
    return;
  }

  logger.info(
    { connectorId: client.connectorId },
    "PagerDuty incremental sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: PagerDutySyncCursor = {
    ...prevCursor,
    lastSyncTime: Date.now(),
  };

  let latestUpdatedAt = prevCursor.lastIncidentUpdatedAt;

  const sinceDate = prevCursor.lastIncidentUpdatedAt
    ? prevCursor.lastIncidentUpdatedAt
    : new Date(prevCursor.lastSyncTime).toISOString();

  await onStageChange?.("Fetching updated incidents", state.processed);

  let offset = 0;
  let hasMore = true;

  while (hasMore && offset <= MAX_PAGINATION_OFFSET) {
    const response = await client.get<PaginatedIncidentsResponse>(
      "/incidents",
      {
        limit: String(DEFAULT_PAGE_LIMIT),
        offset: String(offset),
        since: sinceDate,
        sort_by: "updated_at:asc",
        "include[]": "assignees",
      }
    );

    for (const incident of response.incidents) {
      try {
        await onStageChange?.(
          "Processing incident updates",
          state.processed,
          incident.title
        );

        if (
          incident.updated_at &&
          (!latestUpdatedAt || incident.updated_at > latestUpdatedAt)
        ) {
          latestUpdatedAt = incident.updated_at;
        }

        state.documents.push(await transformIncident(incident, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastIncidentUpdatedAt = latestUpdatedAt;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, incidentId: incident.id },
          "Error processing PagerDuty incident update"
        );
        state.errors += 1;
      }
    }

    hasMore = response.more;
    offset += DEFAULT_PAGE_LIMIT;
  }

  cursor.lastIncidentUpdatedAt = latestUpdatedAt;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "PagerDuty incremental sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
