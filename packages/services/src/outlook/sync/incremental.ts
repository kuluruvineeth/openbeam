import type {
  OutlookSyncBatch,
  OutlookSyncCursor,
  OutlookTransformContext,
} from "@openbeam/types/services/connectors/outlook";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import { MicrosoftGraphApiError } from "../../microsoft/types";
import {
  type OutlookMessage,
  transformOutlookMessage,
} from "../transformers/message";
import { outlookFullSync } from "./full";

export async function* outlookIncrementalSync(
  client: MicrosoftGraphClient,
  context: OutlookTransformContext,
  options: { cursor?: OutlookSyncCursor; batchSize?: number } = {}
): AsyncGenerator<OutlookSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.deltaLink && cursor?.lastFullSync)) {
    yield* outlookFullSync(client, context, { batchSize });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let finalDeltaLink: string | undefined = cursor.deltaLink;

  try {
    for await (const page of client.deltaPages<OutlookMessage>(
      "/me/mailFolders/AllItems/messages/delta",
      cursor.deltaLink
    )) {
      if (page.deltaLink) {
        finalDeltaLink = page.deltaLink;
      }

      for (const message of page.items) {
        if (message["@removed"]) {
          skipped += 1;
          continue;
        }

        try {
          const doc = transformOutlookMessage(message, context);
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
            { error, messageId: message.id },
            "Error transforming Outlook message"
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
    yield* outlookFullSync(client, context, { batchSize });
  }
}
