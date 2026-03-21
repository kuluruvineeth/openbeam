import type {
  MicrosoftCalendarSyncBatch,
  MicrosoftCalendarSyncCursor,
  MicrosoftCalendarTransformContext,
} from "@openbeam/types/services/connectors/microsoft-calendar";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import {
  type MicrosoftCalendarEvent,
  transformMicrosoftCalendarEvent,
} from "../transformers/event";

const DEFAULT_LOOKBACK_DAYS = 90;

export async function* microsoftCalendarFullSync(
  client: MicrosoftGraphClient,
  context: MicrosoftCalendarTransformContext,
  options: {
    batchSize?: number;
    lookbackDays?: number;
  } = {}
): AsyncGenerator<
  MicrosoftCalendarSyncBatch<GenericDocument>,
  void,
  undefined
> {
  const batchSize = options.batchSize ?? 100;
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let finalDeltaLink: string | undefined;

  const startDateTime = new Date(
    Date.now() - lookbackDays * 86_400_000
  ).toISOString();
  const endDateTime = new Date(Date.now() + 365 * 86_400_000).toISOString();

  const deltaPath = `/me/calendarView/delta?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}`;

  logger.info(
    {
      connectorId: client.connectorId,
      lookbackDays,
      startDateTime,
      endDateTime,
    },
    "Microsoft Calendar full sync starting"
  );

  for await (const page of client.deltaPages<MicrosoftCalendarEvent>(
    deltaPath
  )) {
    if (page.deltaLink) {
      finalDeltaLink = page.deltaLink;
    }

    for (const event of page.items) {
      if (event["@removed"]) {
        skipped += 1;
        continue;
      }

      if (event.isCancelled) {
        skipped += 1;
        continue;
      }

      try {
        const doc = transformMicrosoftCalendarEvent(event, context);
        documents.push(doc);
        processed += 1;

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: { lastFullSync: Date.now() },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      } catch (error) {
        logger.error(
          { error, eventId: event.id },
          "Error transforming Microsoft Calendar event"
        );
        errors += 1;
      }
    }
  }

  const cursor: MicrosoftCalendarSyncCursor = {
    deltaLink: finalDeltaLink,
    lastFullSync: Date.now(),
  };

  if (documents.length > 0 || processed === 0) {
    yield {
      items: documents,
      cursor,
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  }
}
