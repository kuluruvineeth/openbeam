import type {
  FreshserviceSyncBatch,
  FreshserviceSyncCursor,
  FreshserviceSyncOptions,
  FreshserviceTransformContext,
} from "@openbeam/types/services/connectors/freshservice";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { FreshserviceClient } from "../client";
import type { FreshserviceTicket } from "../transformers/ticket";
import { transformTicket } from "../transformers/ticket";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 300;

interface PaginatedTicketsResponse {
  tickets: FreshserviceTicket[];
}

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* incrementalSync(
  client: FreshserviceClient,
  context: FreshserviceTransformContext,
  options: FreshserviceSyncOptions = {}
): AsyncGenerator<FreshserviceSyncBatch<GenericDocument>, void, undefined> {
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
    "Freshservice incremental sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: FreshserviceSyncCursor = {
    ...prevCursor,
    lastSyncTime: Date.now(),
  };

  let latestUpdatedAt = prevCursor.lastTicketUpdatedAt;

  const sinceDate = prevCursor.lastTicketUpdatedAt
    ? prevCursor.lastTicketUpdatedAt
    : new Date(prevCursor.lastSyncTime).toISOString();

  await onStageChange?.("Fetching updated tickets", state.processed);

  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_PAGES) {
    const response = await client.get<PaginatedTicketsResponse>("/tickets", {
      per_page: String(DEFAULT_PAGE_SIZE),
      page: String(page),
      updated_since: sinceDate,
      order_type: "asc",
      order_by: "updated_at",
    });

    if (!response.tickets?.length) {
      break;
    }

    for (const ticket of response.tickets) {
      try {
        await onStageChange?.(
          "Processing ticket updates",
          state.processed,
          ticket.subject
        );

        if (
          ticket.updated_at &&
          (!latestUpdatedAt || ticket.updated_at > latestUpdatedAt)
        ) {
          latestUpdatedAt = ticket.updated_at;
        }

        state.documents.push(await transformTicket(ticket, context));
        state.processed += 1;

        if (state.documents.length >= batchSize) {
          cursor.lastTicketUpdatedAt = latestUpdatedAt;
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
        }
      } catch (error) {
        logger.error(
          { error, ticketId: ticket.id },
          "Error processing Freshservice ticket update"
        );
        state.errors += 1;
      }
    }

    hasMore = response.tickets.length === DEFAULT_PAGE_SIZE;
    page += 1;
  }

  cursor.lastTicketUpdatedAt = latestUpdatedAt;

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Freshservice incremental sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
