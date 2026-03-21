import type {
  MicrosoftCalendarSyncBatch,
  MicrosoftCalendarSyncCursor,
  MicrosoftCalendarTransformContext,
} from "@openbeam/types/services/connectors/microsoft-calendar";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { MicrosoftGraphApiError } from "../../microsoft/types";
import {
  type MicrosoftCalendarEvent,
  transformMicrosoftCalendarEvent,
} from "../transformers/event";
import { microsoftCalendarFullSync } from "./full";

export async function* microsoftCalendarIncrementalSync(
  client: MicrosoftGraphClient,
  context: MicrosoftCalendarTransformContext,
  options: {
    cursor?: MicrosoftCalendarSyncCursor;
    batchSize?: number;
    lookbackDays?: number;
  } = {}
): AsyncGenerator<
  MicrosoftCalendarSyncBatch<GenericDocument>,
  void,
  undefined
> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.deltaLink && cursor?.lastFullSync)) {
    yield* microsoftCalendarFullSync(client, context, {
      batchSize,
      lookbackDays: options.lookbackDays,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let finalDeltaLink: string | undefined = cursor.deltaLink;

  try {
    for await (const page of client.deltaPages<MicrosoftCalendarEvent>(
      "/me/calendarView/delta",
      cursor.deltaLink
    )) {
      if (page.deltaLink) {
        finalDeltaLink = page.deltaLink;
      }

      for (const event of page.items) {
        if (event["@removed"]) {
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
            created_at: 0,
            updated_at: Date.now(),
            is_public: false,
            metadata: { deleted: true },
          } as unknown as GenericDocument);
          processed += 1;
          continue;
        }

        if (event.isCancelled) {
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
            created_at: 0,
            updated_at: Date.now(),
            is_public: false,
            metadata: { deleted: true },
          } as unknown as GenericDocument);
          processed += 1;
          continue;
        }

        try {
          const doc = transformMicrosoftCalendarEvent(event, context);
          documents.push(doc);
          processed += 1;

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                deltaLink: finalDeltaLink,
                lastFullSync: cursor.lastFullSync,
              },
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

    yield {
      items: documents,
      cursor: {
        deltaLink: finalDeltaLink,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    const isDeltaExpired =
      error instanceof MicrosoftGraphApiError &&
      (error.code === "syncStateNotFound" || error.statusCode === 410);
    if (!isDeltaExpired) {
      throw error;
    }
    logger.warn({ error }, "Delta token expired, falling back to full sync");
    yield* microsoftCalendarFullSync(client, context, {
      batchSize,
      lookbackDays: options.lookbackDays,
    });
  }
}
