import prisma, {
  createWebhookProcessedLog,
  deleteIndexedDocumentByExternalId,
  getConnectorForSync,
  updateConnector,
  upsertIndexedDocument,
} from "@openplane/db";
import type { WebhookJobData } from "@openplane/redis";
import {
  type AppMentionEvent,
  type CommandContext,
  type DocumentChange,
  type EventHandlerContext,
  handleAppMention,
  handleAskCommand,
  handleSlackEvent,
  parseSlackEvent,
  type SlackChannel,
  type SlackEvent,
  type SlashCommandPayload,
} from "@openplane/services";
import { vespaClient } from "@openplane/vespa";
import { createSlackClientFromConnector } from "../../connectors/slack";
import { calculateDocumentChecksum } from "../../utils/checksum";
import {
  generateEmbeddingsForDocuments,
  isEmbeddingEnabled,
} from "../../utils/embeddings";
import logger from "../../utils/logger";

const ASK_PREFIX_PATTERN = /^ask\s*/i;

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

  if (eventType === "slash_command") {
    return processSlashCommand(data);
  }

  if (eventType === "global_ask") {
    return processGlobalAsk(data);
  }

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

  if (event.type === "app_mention") {
    return processAppMention(event as AppMentionEvent, client, context);
  }

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

  await createWebhookProcessedLog(prisma, {
    connectorId,
    userId: connector.userId,
    eventId,
    eventType,
    operations: appliedChanges,
  });

  await updateConnector(prisma, connectorId, {
    webhookConfig: {
      enabled: true,
      lastReceivedAt: new Date().toISOString(),
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

  await upsertIndexedDocument(prisma, {
    connectorId: ctx.connectorId,
    externalId: doc.external_id,
    vespaId: doc.id,
    documentType: doc.document_type,
    sourceId: doc.source_id,
    checksum,
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
  if (externalIdMatch?.[1]) {
    await deleteIndexedDocumentByExternalId(
      prisma,
      ctx.connectorId,
      externalIdMatch[1]
    );
  }

  logger.debug({ ...ctx, documentId }, "Document deleted from webhook");
  return { operation: "delete", documentId, success: true };
}

async function handlePermissionUpdate(
  change: DocumentChange,
  ctx: ChangeContext
): Promise<ChangeResult | null> {
  const update = change.permissionUpdate;
  if (!update) {
    return null;
  }

  const { channelId, userId, action } = update;

  await vespaClient.updateChannelPermissions(
    ctx.connectorId,
    channelId,
    userId,
    action
  );

  logger.info(
    { ...ctx, channelId, userId, action },
    "Permission update applied"
  );

  return {
    operation: "skip",
    documentId: `permission:${channelId}:${userId}`,
    success: true,
  };
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
        case "permission_update":
          result = await handlePermissionUpdate(change, ctx);
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

interface SlackClientContext {
  connectorId: string;
  teamId: string;
}

interface SlackClientType {
  call<T>(method: string, params: Record<string, unknown>): Promise<T>;
}

async function processAppMention(
  event: AppMentionEvent,
  client: SlackClientType,
  context: SlackClientContext
): Promise<SlackWebhookResult> {
  logger.info(
    {
      channel: event.channel,
      user: event.user,
      text: event.text,
      teamId: context.teamId,
      connectorId: context.connectorId,
    },
    "Processing app_mention event"
  );

  try {
    const assistantContext = {
      connectorId: context.connectorId,
      teamId: context.teamId,
      channelId: event.channel,
      userId: event.user,
      threadTs: event.thread_ts,
      accessControlIds: [event.user],
      responseMode: "always" as const,
      reactionsEnabled: false,
    };

    logger.info({ assistantContext }, "Calling handleAppMention");

    const result = await handleAppMention(
      client as Parameters<typeof handleAppMention>[0],
      event,
      assistantContext
    );

    logger.info(
      {
        handled: result.handled,
        hasResponse: !!result.response,
        hasError: !!result.error,
        errorMessage: result.error?.message,
      },
      "handleAppMention result"
    );

    if (!result.handled) {
      logger.warn(
        { channel: event.channel, user: event.user, text: event.text },
        "App mention not handled - query may be too short or empty"
      );
    }

    return { processed: true, operation: "skip", reason: "app_mention" };
  } catch (error) {
    logger.error(
      { error, channel: event.channel, text: event.text },
      "Failed to handle app mention"
    );
    return { processed: false, reason: "app_mention_error" };
  }
}

interface SlashCommandJobPayload extends SlashCommandPayload {
  _subcommand: string;
  _context: CommandContext;
}

async function processSlashCommand(
  data: WebhookJobData
): Promise<SlackWebhookResult> {
  const payload = data.payload as unknown as SlashCommandJobPayload;
  const { response_url, _subcommand, _context } = payload;

  logger.debug(
    { connectorId: data.connectorId, subcommand: _subcommand },
    "Processing slash command"
  );

  try {
    const commandPayload: SlashCommandPayload = {
      token: payload.token,
      team_id: payload.team_id,
      team_domain: payload.team_domain,
      enterprise_id: payload.enterprise_id,
      enterprise_name: payload.enterprise_name,
      channel_id: payload.channel_id,
      channel_name: payload.channel_name,
      user_id: payload.user_id,
      user_name: payload.user_name,
      command: payload.command,
      text: payload.text.replace(ASK_PREFIX_PATTERN, ""),
      response_url: payload.response_url,
      trigger_id: payload.trigger_id,
      api_app_id: payload.api_app_id,
    };

    const result = await handleAskCommand(commandPayload, _context);

    await fetch(response_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: result.response_type ?? "ephemeral",
        replace_original: true,
        text: result.text,
        blocks: result.blocks,
      }),
    });

    return { processed: true, operation: "skip", reason: "slash_command_ask" };
  } catch (error) {
    logger.error(
      { error, connectorId: data.connectorId, subcommand: _subcommand },
      "Failed to process slash command"
    );

    await fetch(response_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response_type: "ephemeral",
        replace_original: true,
        text: `Failed to process command: ${error instanceof Error ? error.message : "Unknown error"}`,
      }),
    });

    return { processed: false, reason: "slash_command_error" };
  }
}

async function processGlobalAsk(
  data: WebhookJobData
): Promise<SlackWebhookResult> {
  const { connectorId, payload } = data;
  const { question, userId, teamId } = payload as {
    question: string;
    userId: string;
    teamId: string;
  };

  logger.debug({ connectorId, question }, "Processing global ask");

  try {
    const connector = await getConnectorForSync(prisma, connectorId);
    if (!connector) {
      return { processed: false, reason: "connector_not_found" };
    }

    const { client } = createSlackClientFromConnector(connector);
    const { ragAnswer } = await import("@openplane/services");

    const result = await ragAnswer({
      query: question,
      teamId,
      accessControlIds: [userId, `team:${teamId}`],
      topK: 10,
    });

    const blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Question:* ${question}` },
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: result.answer || "_No answer found._" },
      },
    ];

    if (result.citations.length > 0) {
      const citationText = result.citations
        .slice(0, 5)
        .map((c, i) => `${i + 1}. ${c.title}`)
        .join("\n");
      blocks.push({ type: "divider" }, {
        type: "context",
        elements: [{ type: "mrkdwn", text: `*Sources:*\n${citationText}` }],
      } as never);
    }

    await client.call("chat.postMessage", {
      channel: userId,
      blocks,
      text: `Answer: ${result.answer}`,
    });

    return { processed: true, operation: "skip", reason: "global_ask" };
  } catch (error) {
    logger.error(
      { error, connectorId, question },
      "Failed to process global ask"
    );
    return { processed: true, reason: "global_ask_error" };
  }
}

export function shouldProcessRealtime(eventType: string): boolean {
  const realtimeEvents = new Set([
    "app_mention",
    "channel_archive",
    "channel_created",
    "channel_deleted",
    "channel_rename",
    "channel_unarchive",
    "file_deleted",
    "file_shared",
    "global_ask",
    "member_joined_channel",
    "member_left_channel",
    "message",
    "message_changed",
    "message_deleted",
    "reaction_added",
    "reaction_removed",
    "slash_command",
    "team_join",
    "user_change",
  ]);

  return realtimeEvents.has(eventType);
}
