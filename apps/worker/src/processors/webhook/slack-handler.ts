import prisma, { getConnectorForSync } from "@openplane/db";
import type { WebhookJobData } from "@openplane/redis";
import {
  type DocumentChange,
  type EventHandlerContext,
  handleSlackEvent,
  parseSlackEvent,
  type SlackChannel,
  type SlackEvent,
} from "@openplane/services";
import { vespaClient } from "@openplane/vespa";
import { createSlackClientFromConnector } from "../../connectors/slack";
import { calculateDocumentChecksum } from "../../utils/checksum";
import {
  generateEmbeddingsForDocuments,
  isEmbeddingEnabled,
} from "../../utils/embeddings";
import logger from "../../utils/logger";

type WebhookOperation = "create" | "update" | "delete" | "skip";

export interface SlackWebhookResult {
  processed: boolean;
  operation?: WebhookOperation;
  documentId?: string;
  reason?: string;
}

export async function processSlackWebhook(
  data: WebhookJobData
): Promise<SlackWebhookResult> {
  const { connectorId, eventId, eventType, payload } = data;

  logger.debug(
    { connectorId, eventId, eventType },
    "Processing Slack webhook event"
  );

  const parseResult = parseSlackEvent(payload);
  if (!parseResult.success) {
    logger.warn(
      { connectorId, eventId, error: parseResult.error },
      "Failed to parse Slack event"
    );
    return { processed: false, reason: "parse_error" };
  }

  const { event } = parseResult;
  if (!event) {
    return { processed: false, reason: "no_event" };
  }

  const connector = await getConnectorForSync(prisma, connectorId);
  if (!connector) {
    logger.warn({ connectorId, eventId }, "Connector not found");
    return { processed: false, reason: "connector_not_found" };
  }

  if (connector.status !== "ACTIVE") {
    logger.warn(
      { connectorId, eventId, status: connector.status },
      "Connector not active"
    );
    return { processed: false, reason: "connector_inactive" };
  }

  const { client, context } = createSlackClientFromConnector(connector);

  const handlerContext: EventHandlerContext = {
    ...context,
    client,
    channelCache: new Map<string, SlackChannel>(),
    memberCache: new Map<string, string[]>(),
  };

  const result = await handleSlackEvent(event as SlackEvent, handlerContext);

  if (result.errors.length > 0) {
    logger.warn(
      { connectorId, eventId, errors: result.errors.map((e) => e.message) },
      "Errors processing Slack event"
    );
  }

  if (result.changes.length === 0) {
    logger.debug(
      { connectorId, eventId, eventType },
      "No document changes from event"
    );
    return { processed: true, operation: "skip", reason: "no_changes" };
  }

  const appliedChanges = await applyDocumentChanges(
    result.changes,
    connectorId,
    eventId
  );

  await prisma.connectorAuditLog.create({
    data: {
      connectorId,
      userId: connector.userId,
      action: "WEBHOOK_PROCESSED",
      changes: {
        eventId,
        eventType,
        operations: appliedChanges.map((c) => ({ ...c })),
        processedAt: new Date().toISOString(),
      },
    },
  });

  // Update webhook status for UI
  await prisma.connector.update({
    where: { id: connectorId },
    data: {
      webhookConfig: {
        enabled: true,
        lastReceivedAt: new Date().toISOString(),
      },
    },
  });

  const primaryChange = appliedChanges[0];
  return {
    processed: true,
    operation: primaryChange?.operation,
    documentId: primaryChange?.documentId,
  };
}

interface ChangeContext {
  connectorId: string;
  eventId: string;
}

interface ChangeResult {
  operation: WebhookOperation;
  documentId: string;
  success: boolean;
}

async function handleCreateOrUpdate(
  change: DocumentChange,
  ctx: ChangeContext
): Promise<ChangeResult | null> {
  if (!change.document) {
    logger.warn(
      { ...ctx, operation: change.operation },
      "Missing document for create/update operation"
    );
    return null;
  }

  const doc = change.document;
  const checksum = calculateDocumentChecksum({
    title: doc.title,
    content: doc.content,
  });

  const embeddingsEnabled = isEmbeddingEnabled();
  let docToIndex = doc;

  if (embeddingsEnabled) {
    logger.debug(
      { ...ctx, documentId: doc.id },
      "Generating embeddings for webhook document"
    );
    const [docWithEmbeddings] = await generateEmbeddingsForDocuments(
      [doc],
      ctx.connectorId
    );
    if (docWithEmbeddings) {
      docToIndex = docWithEmbeddings;
    }
  }

  await vespaClient.feedDocument(docToIndex);

  await prisma.indexedDocument.upsert({
    where: {
      connectorId_externalId: {
        connectorId: ctx.connectorId,
        externalId: doc.external_id,
      },
    },
    update: { checksum, lastSyncedAt: new Date() },
    create: {
      connectorId: ctx.connectorId,
      externalId: doc.external_id,
      vespaId: doc.id,
      documentType: doc.document_type,
      sourceId: doc.source_id,
      checksum,
    },
  });

  logger.debug(
    {
      ...ctx,
      operation: change.operation,
      documentId: doc.id,
      withEmbeddings: embeddingsEnabled,
    },
    "Document indexed from webhook"
  );
  return {
    operation: change.operation as WebhookOperation,
    documentId: doc.id,
    success: true,
  };
}

async function handleDelete(
  change: DocumentChange,
  ctx: ChangeContext
): Promise<ChangeResult | null> {
  const documentId = change.documentId;
  if (!documentId) {
    logger.warn(ctx, "Missing documentId for delete operation");
    return null;
  }

  await vespaClient.deleteDocument(documentId);

  const externalIdMatch = documentId.match(
    new RegExp(`^${ctx.connectorId}_(.+)$`)
  );
  if (externalIdMatch) {
    await prisma.indexedDocument.deleteMany({
      where: { connectorId: ctx.connectorId, externalId: externalIdMatch[1] },
    });
  }

  logger.debug({ ...ctx, documentId }, "Document deleted from webhook");
  return { operation: "delete", documentId, success: true };
}

async function applyDocumentChanges(
  changes: DocumentChange[],
  connectorId: string,
  eventId: string
): Promise<ChangeResult[]> {
  const ctx: ChangeContext = { connectorId, eventId };
  const results: ChangeResult[] = [];

  for (const change of changes) {
    try {
      let result: ChangeResult | null = null;

      switch (change.operation) {
        case "create":
        case "update":
          result = await handleCreateOrUpdate(change, ctx);
          break;
        case "delete":
          result = await handleDelete(change, ctx);
          break;
        default:
          logger.warn(
            { ...ctx, operation: change.operation },
            "Unknown operation type"
          );
      }

      if (result) {
        results.push(result);
      }
    } catch (error) {
      logger.error(
        {
          error,
          ...ctx,
          operation: change.operation,
          documentId: change.documentId ?? change.document?.id,
        },
        "Failed to apply document change"
      );
      results.push({
        operation: change.operation as WebhookOperation,
        documentId: change.documentId ?? change.document?.id ?? "unknown",
        success: false,
      });
    }
  }

  return results;
}

export function shouldProcessRealtime(eventType: string): boolean {
  const realtimeEvents = new Set([
    "message",
    "message_changed",
    "message_deleted",
    "reaction_added",
    "reaction_removed",
    "channel_created",
    "channel_deleted",
    "channel_rename",
    "channel_archive",
    "channel_unarchive",
    "member_joined_channel",
    "member_left_channel",
    "user_change",
    "team_join",
    "file_shared",
    "file_deleted",
  ]);

  return realtimeEvents.has(eventType);
}
