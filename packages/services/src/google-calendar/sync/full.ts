import type {
  GoogleCalendarSyncBatch,
  GoogleCalendarSyncCursor,
  GoogleCalendarTransformContext,
} from "@openbeam/types/services/connectors/google-calendar";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { GoogleCalendarClient } from "../client";
import { transformCalendarEvent } from "../transformers/event";

export async function* googleCalendarFullSync(
  client: GoogleCalendarClient,
  context: GoogleCalendarTransformContext,
  options: {
    batchSize?: number;
    includeCalendars?: string[];
    lookbackDays?: number;
  } = {}
): AsyncGenerator<GoogleCalendarSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  const syncTokens: Record<string, string> = {};

  const timeMin = options.lookbackDays
    ? new Date(Date.now() - options.lookbackDays * 86_400_000).toISOString()
    : undefined;

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

  logger.info(
    { connectorId: client.connectorId, calendarCount: calendars.length },
    "Google Calendar full sync starting"
  );

  for (const calendar of calendars) {
    for await (const page of client.listEvents(calendar.id, {
      timeMin,
      showDeleted: false,
      singleEvents: true,
    })) {
      for (const event of page.events) {
        if (event.status === "cancelled") {
          skipped += 1;
          continue;
        }

        try {
          const doc = transformCalendarEvent(event, context, calendar.name);
          documents.push(doc);
          processed += 1;
        } catch (error) {
          logger.error(
            { error, eventId: event.id, calendarId: calendar.id },
            "Error transforming calendar event"
          );
          errors += 1;
        }
      }

      if (page.nextSyncToken) {
        syncTokens[calendar.id] = page.nextSyncToken;
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { syncTokens, lastFullSync: Date.now() },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }
  }

  const cursor: GoogleCalendarSyncCursor = {
    syncTokens,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
