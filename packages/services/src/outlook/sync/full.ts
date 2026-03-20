import type {
  OutlookSyncBatch,
  OutlookSyncCursor,
  OutlookTransformContext,
} from "@openbeam/types/services/connectors/outlook";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { MicrosoftGraphClient } from "../../microsoft/client";
import {
  type OutlookMessage,
  transformOutlookMessage,
} from "../transformers/message";

export type OutlookAttachmentInfo = {
  messageId: string;
  subject: string;
  hasAttachments: boolean;
};

export async function* outlookFullSync(
  client: MicrosoftGraphClient,
  context: OutlookTransformContext,
  options: {
    batchSize?: number;
    lookbackDays?: number;
    onAttachmentsDiscovered?: (
      attachments: OutlookAttachmentInfo[]
    ) => Promise<void>;
  } = {}
): AsyncGenerator<OutlookSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let finalDeltaLink: string | undefined;

  const deltaPath = options.lookbackDays
    ? `/me/mailFolders/AllItems/messages/delta?$filter=receivedDateTime ge ${new Date(Date.now() - options.lookbackDays * 86_400_000).toISOString()}`
    : "/me/mailFolders/AllItems/messages/delta";

  for await (const page of client.deltaPages<OutlookMessage>(deltaPath)) {
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

        if (message.hasAttachments && options.onAttachmentsDiscovered) {
          const attachments: OutlookAttachmentInfo[] = [
            {
              messageId: message.id,
              subject: message.subject,
              hasAttachments: true,
            },
          ];
          await options.onAttachmentsDiscovered(attachments);
        }

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
          { error, messageId: message.id },
          "Error transforming Outlook message"
        );
        errors += 1;
      }
    }
  }

  const cursor: OutlookSyncCursor = {
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
