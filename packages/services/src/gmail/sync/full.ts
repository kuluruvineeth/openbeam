import type {
  GmailAttachmentInfo,
  GmailMediaInfo,
  GmailSyncBatch,
  GmailSyncCursor,
  GmailThread,
  GmailTransformContext,
} from "@openbeam/types/services/connectors/gmail";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { extractAllAttachments, extractAllMedia } from "../api/attachments";
import { buildLabelQuery, type LabelLookup } from "../api/labels";
import { fetchThreadsWithMessages } from "../api/threads";
import type { GmailClient } from "../client";
import { transformThread } from "../transformers/thread";

export interface FullSyncOptions {
  batchSize?: number;
  includeLabels?: string[];
  excludeLabels?: string[];
  lookbackDays?: number;
  indexAttachments?: boolean;
  indexMedia?: boolean;
  labelLookup?: LabelLookup;
  initialHistoryId?: string;
  onAttachmentsDiscovered?: (
    attachments: GmailAttachmentInfo[]
  ) => Promise<void>;
  onMediaDiscovered?: (media: GmailMediaInfo[]) => Promise<void>;
}

export async function* fullSync(
  client: GmailClient,
  context: GmailTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<GmailSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = 100,
    includeLabels,
    excludeLabels = ["SPAM", "TRASH"],
    lookbackDays,
    indexAttachments = true,
    indexMedia = true,
    labelLookup,
    initialHistoryId,
    onAttachmentsDiscovered,
    onMediaDiscovered,
  } = options;

  const query = buildFullSyncQuery(includeLabels, excludeLabels, lookbackDays);

  logger.info(
    { query, includeLabels, excludeLabels, lookbackDays },
    "Gmail full sync query built"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestTimestamp: number | undefined;

  const cursor: GmailSyncCursor = {
    lastFullSync: Date.now(),
    historyId: initialHistoryId,
  };

  let threadCount = 0;
  for await (const thread of fetchThreadsWithMessages(client, { query })) {
    threadCount += 1;
    try {
      const result = await transformThread(thread, context, { labelLookup });

      documents.push(result.threadDocument);
      documents.push(...result.messageDocuments);

      const threadTimestamp = getThreadTimestamp(thread);
      if (!latestTimestamp || threadTimestamp > latestTimestamp) {
        latestTimestamp = threadTimestamp;
      }

      if (indexAttachments && onAttachmentsDiscovered) {
        const attachments = extractThreadAttachments(thread);
        if (attachments.length > 0) {
          await onAttachmentsDiscovered(attachments);
        }
      }

      if (indexMedia && onMediaDiscovered) {
        const media = extractThreadMedia(thread);
        if (media.length > 0) {
          await onMediaDiscovered(media);
        }
      }

      processed += 1;

      if (documents.length >= batchSize) {
        cursor.lastMessageTimestamp = latestTimestamp;

        yield {
          items: documents,
          cursor: { ...cursor },
          hasMore: true,
          stats: { processed, skipped, errors },
        };

        documents = [];
      }
    } catch (error) {
      logger.error(
        { error, threadId: thread.id, messageCount: thread.messages?.length },
        "Error transforming Gmail thread"
      );
      errors += 1;
    }
  }

  logger.info(
    { threadCount, processed, errors, documentsCount: documents.length },
    "Gmail full sync iteration complete"
  );

  if (documents.length > 0) {
    cursor.lastMessageTimestamp = latestTimestamp;

    yield {
      items: documents,
      cursor: { ...cursor },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  }
}

function buildFullSyncQuery(
  includeLabels?: string[],
  excludeLabels?: string[],
  lookbackDays?: number
): string {
  const parts: string[] = [];

  const labelQuery = buildLabelQuery(includeLabels, excludeLabels);
  if (labelQuery) {
    parts.push(labelQuery);
  }

  if (lookbackDays && lookbackDays > 0) {
    const date = new Date();
    date.setDate(date.getDate() - lookbackDays);
    const dateStr = date.toISOString().split("T")[0];
    parts.push(`after:${dateStr}`);
  }

  return parts.join(" ");
}

function getThreadTimestamp(thread: GmailThread): number {
  const messages = thread.messages ?? [];
  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    return Date.now();
  }

  if (lastMessage.internalDate) {
    return Number.parseInt(lastMessage.internalDate, 10);
  }

  return Date.now();
}

function extractThreadAttachments(thread: GmailThread): GmailAttachmentInfo[] {
  const messages = thread.messages ?? [];
  return extractAllAttachments(messages);
}

function extractThreadMedia(thread: GmailThread): GmailMediaInfo[] {
  const messages = thread.messages ?? [];
  return extractAllMedia(messages);
}
