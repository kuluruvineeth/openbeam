import type {
  GoogleCalendarSyncBatch,
  GoogleCalendarSyncCursor,
  GoogleCalendarTransformContext,
} from "@openbeam/types/services/connectors/google-calendar";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { GoogleCalendarClient } from "../client";
import { transformCalendarEvent } from "../transformers/event";
import { GoogleCalendarApiError } from "../types";
import { googleCalendarFullSync } from "./full";

export async function* googleCalendarIncrementalSync(
  client: GoogleCalendarClient,
  context: GoogleCalendarTransformContext,
  options: {
    cursor?: GoogleCalendarSyncCursor;
    batchSize?: number;
    includeCalendars?: string[];
    lookbackDays?: number;
  } = {}
): AsyncGenerator<GoogleCalendarSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.syncToken && cursor?.lastFullSync)) {
    yield* googleCalendarFullSync(client, context, {
      batchSize,
      includeCalendars: options.includeCalendars,
      lookbackDays: options.lookbackDays,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let finalSyncToken: string | undefined = cursor.syncToken;

  const calendars: Array<{ id: string; name: string }> = [];

  for await (const batch of client.listCalendars()) {
    for (const cal of batch) {
      if (
        options.includeCalendars?.length &&
        !options.includeCalendars.includes(cal.id)
      ) {
        continue;
      }
      calendars.push({ id: cal.id, name: cal.summary });
    }
  }

  try {
    for (const calendar of calendars) {
      for await (const page of client.listEvents(calendar.id, {
        syncToken: cursor.syncToken,
        showDeleted: true,
        singleEvents: true,
      })) {
        for (const event of page.events) {
          if (event.status === "cancelled") {
            documents.push({
              id: `${context.connectorId}_event_${event.id}`,
              connector_id: context.connectorId,
              connector_type: context.connectorType,
              team_id: context.teamId,
              workspace_id: context.workspaceId,
              external_id: event.id,
              document_type: "event",
              title: "",
              content: "",
              url: "",
              metadata: { deleted: true },
            } as unknown as GenericDocument);
            processed += 1;
            continue;
          }

          try {
            const doc = transformCalendarEvent(event, context, calendar.name);
            documents.push(doc);
            processed += 1;
          } catch (error) {
            logger.error(
              { error, eventId: event.id },
              "Error transforming calendar event"
            );
            errors += 1;
          }
        }

        if (page.nextSyncToken) {
          finalSyncToken = page.nextSyncToken;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              syncToken: finalSyncToken,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        syncToken: finalSyncToken,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    const isSyncTokenExpired =
      error instanceof GoogleCalendarApiError && error.statusCode === 410;

    if (!isSyncTokenExpired) {
      throw error;
    }

    logger.warn(
      { connectorId: client.connectorId },
      "Google Calendar syncToken expired, falling back to full sync"
    );
    yield* googleCalendarFullSync(client, context, {
      batchSize,
      includeCalendars: options.includeCalendars,
      lookbackDays: options.lookbackDays,
    });
  }
}
