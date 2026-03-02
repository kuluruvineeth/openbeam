import type {
  GmailAttachmentInfo,
  GmailHistoryRecord,
  GmailMediaInfo,
  GmailSyncBatch,
  GmailTransformContext,
} from "@openplane/types/services/connectors/gmail";
import type { GenericDocument } from "@openplane/vespa";
import { extractAllAttachments, extractAllMedia } from "../api/attachments";
import {
  dedupeHistoryChanges,
  fetchHistory,
  getAddedMessageIds,
  getDeletedMessageIds,
  parseHistoryChanges,
} from "../api/history";
import type { LabelLookup } from "../api/labels";
import { batchGetMessages } from "../api/messages";
import type { GmailClient } from "../client";
import { transformMessage } from "../transformers/message";

export interface HistorySyncOptions {
  startHistoryId: string;
  batchSize?: number;
  includeLabels?: string[];
  excludeLabels?: string[];
  indexAttachments?: boolean;
  indexMedia?: boolean;
  labelLookup?: LabelLookup;
  onAttachmentsDiscovered?: (
    attachments: GmailAttachmentInfo[]
  ) => Promise<void>;
  onMediaDiscovered?: (media: GmailMediaInfo[]) => Promise<void>;
}

export interface HistorySyncResult {
  documentsAdded: GenericDocument[];
  documentsDeleted: string[];
  newHistoryId?: string;
}

export async function* historySync(
  client: GmailClient,
  context: GmailTransformContext,
  options: HistorySyncOptions
): AsyncGenerator<GmailSyncBatch<GenericDocument>, void, undefined> {
  const {
    startHistoryId,
    batchSize = 100,
    indexAttachments = true,
    indexMedia = true,
    labelLookup,
    onAttachmentsDiscovered,
    onMediaDiscovered,
  } = options;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let newHistoryId: string | undefined;

  const historyRecords: GmailHistoryRecord[] = [];

  const generator = fetchHistory(client, {
    startHistoryId,
    historyTypes: ["messageAdded", "messageDeleted"],
  });

  let result = await generator.next();
  while (!result.done) {
    historyRecords.push(result.value);
    result = await generator.next();
  }

  if (result.value) {
    newHistoryId = result.value.historyId;
  }

  const allChanges = parseHistoryChanges(historyRecords);
  const dedupedChanges = dedupeHistoryChanges(allChanges);

  const addedMessageIds = getAddedMessageIds(dedupedChanges);
  const deletedMessageIds = getDeletedMessageIds(dedupedChanges);

  if (addedMessageIds.length > 0) {
    const messages = await batchGetMessages(client, addedMessageIds);

    for (const message of messages) {
      try {
        const doc = await transformMessage(message, context, { labelLookup });
        documents.push(doc);

        if (indexAttachments && onAttachmentsDiscovered) {
          const attachments = extractAllAttachments([message]);
          if (attachments.length > 0) {
            await onAttachmentsDiscovered(attachments);
          }
        }

        if (indexMedia && onMediaDiscovered) {
          const media = extractAllMedia([message]);
          if (media.length > 0) {
            await onMediaDiscovered(media);
          }
        }

        processed += 1;

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              historyId: newHistoryId ?? startHistoryId,
              lastFullSync: undefined,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };

          documents = [];
        }
      } catch {
        errors += 1;
      }
    }
  }

  if (deletedMessageIds.length > 0) {
    const deleteDocuments = deletedMessageIds.map((messageId) =>
      createDeleteMarker(context, messageId)
    );
    documents.push(...deleteDocuments);
  }

  yield {
    items: documents,
    cursor: {
      historyId: newHistoryId ?? startHistoryId,
      lastFullSync: undefined,
    },
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function createDeleteMarker(
  context: GmailTransformContext,
  messageId: string
): GenericDocument {
  return {
    id: `${context.connectorId}_email_${messageId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: messageId,
    document_type: "email",
    title: "",
    content: "",
    created_at: 0,
    updated_at: 0,
    is_public: false,
    metadata: {
      deleted: true,
      deletedAt: Date.now(),
    },
  };
}

export async function processHistoryBatch(
  client: GmailClient,
  context: GmailTransformContext,
  messageIds: string[],
  options: {
    labelLookup?: LabelLookup;
    indexAttachments?: boolean;
    indexMedia?: boolean;
    onAttachmentsDiscovered?: (
      attachments: GmailAttachmentInfo[]
    ) => Promise<void>;
    onMediaDiscovered?: (media: GmailMediaInfo[]) => Promise<void>;
  }
): Promise<GenericDocument[]> {
  const {
    labelLookup,
    indexAttachments = true,
    indexMedia = true,
    onAttachmentsDiscovered,
    onMediaDiscovered,
  } = options;

  const documents: GenericDocument[] = [];

  const messages = await batchGetMessages(client, messageIds);

  for (const message of messages) {
    const doc = await transformMessage(message, context, { labelLookup });
    documents.push(doc);

    if (indexAttachments && onAttachmentsDiscovered) {
      const attachments = extractAllAttachments([message]);
      if (attachments.length > 0) {
        await onAttachmentsDiscovered(attachments);
      }
    }

    if (indexMedia && onMediaDiscovered) {
      const media = extractAllMedia([message]);
      if (media.length > 0) {
        await onMediaDiscovered(media);
      }
    }
  }

  return documents;
}
