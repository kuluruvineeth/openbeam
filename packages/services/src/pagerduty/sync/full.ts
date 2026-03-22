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
import type { PagerDutySchedule } from "../transformers/schedule";
import { transformSchedule } from "../transformers/schedule";
import type { PagerDutyService } from "../transformers/service";
import { transformService } from "../transformers/service";
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

interface PaginatedServicesResponse {
  services: PagerDutyService[];
  limit: number;
  offset: number;
  total: number | null;
  more: boolean;
}

interface PaginatedSchedulesResponse {
  schedules: PagerDutySchedule[];
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

function buildSinceDate(lookbackDays?: number): string {
  const days = lookbackDays ?? 90;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

function parseCommaSeparated(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function* fullSync(
  client: PagerDutyClient,
  context: PagerDutyTransformContext,
  options: PagerDutySyncOptions = {}
): AsyncGenerator<PagerDutySyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncServices = true,
    syncSchedules = true,
    lookbackDays,
    urgencyFilter,
    statusFilter,
    serviceIdsFilter,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncServices,
      syncSchedules,
      lookbackDays,
    },
    "PagerDuty full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: PagerDutySyncCursor = {
    lastSyncTime: Date.now(),
  };

  let latestUpdatedAt: string | undefined;

  await onStageChange?.("Syncing incidents", state.processed);
  const sinceDate = buildSinceDate(lookbackDays);
  const urgencies = parseCommaSeparated(urgencyFilter);
  const statuses = parseCommaSeparated(statusFilter);

  let offset = 0;
  let hasMore = true;

  while (hasMore && offset <= MAX_PAGINATION_OFFSET) {
    const params: Record<string, string> = {
      limit: String(DEFAULT_PAGE_LIMIT),
      offset: String(offset),
      since: sinceDate,
      sort_by: "updated_at:desc",
      "include[]": "assignees",
    };

    if (urgencies.length > 0) {
      for (const u of urgencies) {
        params["urgencies[]"] = u;
      }
    }
    if (statuses.length > 0) {
      for (const s of statuses) {
        params["statuses[]"] = s;
      }
    }
    if (serviceIdsFilter?.length) {
      for (const sid of serviceIdsFilter) {
        params["service_ids[]"] = sid;
      }
    }

    const response = await client.get<PaginatedIncidentsResponse>(
      "/incidents",
      params
    );

    for (const incident of response.incidents) {
      try {
        await onStageChange?.(
          "Processing incidents",
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
          "Error processing PagerDuty incident"
        );
        state.errors += 1;
      }
    }

    hasMore = response.more;
    offset += DEFAULT_PAGE_LIMIT;
  }

  if (syncServices) {
    await onStageChange?.("Syncing services", state.processed);
    offset = 0;
    hasMore = true;

    while (hasMore && offset <= MAX_PAGINATION_OFFSET) {
      const response = await client.get<PaginatedServicesResponse>(
        "/services",
        {
          limit: String(DEFAULT_PAGE_LIMIT),
          offset: String(offset),
          "include[]": "integrations",
        }
      );

      for (const service of response.services) {
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
            "Error processing PagerDuty service"
          );
          state.errors += 1;
        }
      }

      hasMore = response.more;
      offset += DEFAULT_PAGE_LIMIT;
    }
  }

  if (syncSchedules) {
    await onStageChange?.("Syncing schedules", state.processed);
    offset = 0;
    hasMore = true;

    while (hasMore && offset <= MAX_PAGINATION_OFFSET) {
      const response = await client.get<PaginatedSchedulesResponse>(
        "/schedules",
        {
          limit: String(DEFAULT_PAGE_LIMIT),
          offset: String(offset),
        }
      );

      for (const schedule of response.schedules) {
        try {
          await onStageChange?.(
            "Processing schedules",
            state.processed,
            schedule.name
          );
          state.documents.push(await transformSchedule(schedule, context));
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, scheduleId: schedule.id },
            "Error processing PagerDuty schedule"
          );
          state.errors += 1;
        }
      }

      hasMore = response.more;
      offset += DEFAULT_PAGE_LIMIT;
    }
  }

  cursor.lastIncidentUpdatedAt = latestUpdatedAt;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "PagerDuty full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
