import prisma, { getConnectorForSync } from "@openplane/db";
import {
  getSidebarContext,
  getSidebarContextKey,
  type SidebarThreadContext,
  type WebhookJobData,
} from "@openplane/redis";
import {
  buildSidebarResponseBlocks,
  handleSidebarSearch,
  ragAnswer,
  type SidebarContext,
  type SidebarResponse,
  searchService,
  setThreadStatus,
  truncateForSlack,
} from "@openplane/services";
import { createSlackClientFromConnector } from "../../connectors/slack";
import logger from "../../utils/logger";

interface MessageEvent {
  type: string;
  channel: string;
  channel_type?: string;
  user?: string;
  bot_id?: string;
  subtype?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
}

interface SidebarMessageResult {
  processed: boolean;
  operation?: string;
  reason?: string;
}

function createSidebarDeps() {
  return {
    searchService: {
      search: async (params: {
        query: string;
        teamId: string;
        accessControlIds: string[];
        limit: number;
        sourceId?: string;
      }) => {
        logger.info(
          {
            query: params.query,
            teamId: params.teamId,
            sourceId: params.sourceId,
            accessControlIds: params.accessControlIds,
            limit: params.limit,
          },
          "Sidebar search params"
        );

        const results = await searchService.searchUnified({
          query: params.query,
          teamId: params.teamId,
          limit: params.limit,
          includeDocuments: true,
          accessControlIds: params.accessControlIds,
          sourceId: params.sourceId,
        });

        logger.info(
          {
            documentCount: results.documents.length,
            mediaCount: results.media.length,
            total: results.total,
            documents: results.documents.slice(0, 5).map((doc) => ({
              title: doc.title,
              author_name: doc.author_name,
              source_id: doc.source_id,
              source_name: doc.source_name,
              document_type: doc.document_type,
              content_preview: doc.content?.slice(0, 100),
            })),
          },
          "Sidebar search results from Vespa"
        );

        return {
          documents: results.documents.map((doc) => ({
            title: doc.title,
            url: doc.url,
            content: doc.content,
            score: (doc as unknown as { relevance?: number }).relevance ?? 0,
            documentType: doc.document_type,
          })),
          total: results.total,
        };
      },
    },
    ragService: {
      answer: async (params: {
        query: string;
        teamId: string;
        accessControlIds: string[];
        topK: number;
        sourceId?: string;
      }) => {
        logger.info(
          {
            query: params.query,
            teamId: params.teamId,
            sourceId: params.sourceId,
            topK: params.topK,
          },
          "Sidebar RAG params"
        );

        const result = await ragAnswer({
          query: params.query,
          teamId: params.teamId,
          accessControlIds: params.accessControlIds,
          topK: params.topK,
          sourceId: params.sourceId,
          includeMetadata: true,
        });

        logger.info(
          {
            answer: result.answer.slice(0, 200),
            citationCount: result.citations.length,
            contextDocCount: result.context.documents.length,
            contextDocs: result.context.documents.slice(0, 3).map((d) => ({
              title: d.title,
              content_preview: d.content.slice(0, 150),
              relevanceScore: d.relevanceScore,
            })),
          },
          "Sidebar RAG result"
        );

        return {
          answer: result.answer,
          citations: result.citations.map((c) => ({
            title: c.title,
            url: c.url,
          })),
        };
      },
    },
  };
}

export async function isAssistantThreadMessage(
  event: MessageEvent
): Promise<SidebarThreadContext | null> {
  if (event.bot_id) {
    return null;
  }

  if (event.subtype === "bot_message") {
    return null;
  }

  const isDmChannel =
    event.channel_type === "im" || event.channel.startsWith("D");
  if (!(isDmChannel && event.thread_ts)) {
    return null;
  }

  const contextKey = getSidebarContextKey(event.channel, event.thread_ts);
  const context = await getSidebarContext(contextKey);

  return context;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validation steps and error handling are inherent to sidebar message processing
export async function processSidebarMessage(
  jobData: WebhookJobData,
  sidebarContext: SidebarThreadContext
): Promise<SidebarMessageResult> {
  const { connectorId, payload } = jobData;
  const slackPayload = payload as { event?: MessageEvent };
  const event = slackPayload.event;

  if (!event) {
    return { processed: false, reason: "no_event" };
  }

  if (event.bot_id || event.subtype === "bot_message") {
    return { processed: true, operation: "skip", reason: "bot_message" };
  }

  const connector = await getConnectorForSync(prisma, connectorId);
  if (!connector) {
    logger.warn({ connectorId }, "Connector not found for sidebar message");
    return { processed: false, reason: "connector_not_found" };
  }

  if (connector.status !== "ACTIVE") {
    return { processed: false, reason: "connector_inactive" };
  }

  const config = connector.config as { botUserId?: string } | null;
  if (config?.botUserId && event.user === config.botUserId) {
    return { processed: true, operation: "skip", reason: "own_bot_message" };
  }

  const { client } = createSlackClientFromConnector(connector, {
    preferBotToken: true,
  });
  const userId = event.user ?? sidebarContext.userId;
  const query = event.text ?? "";

  if (!query.trim()) {
    return { processed: true, operation: "skip", reason: "empty_query" };
  }

  const threadContext = {
    channelId: event.channel,
    threadTs: event.thread_ts ?? event.ts,
    userId,
  };

  const context: SidebarContext = {
    channelId: sidebarContext.contextChannelId ?? event.channel,
    channelType: "channel",
    teamId: sidebarContext.teamId,
    userId,
    threadTs: event.thread_ts,
  };

  logger.info(
    {
      connectorId,
      dmChannelId: event.channel,
      contextChannelId: context.channelId,
      sidebarContextChannelId: sidebarContext.contextChannelId,
      teamId: sidebarContext.teamId,
      threadTs: event.thread_ts,
      query,
      accessControlIds: [userId, `team:${sidebarContext.teamId}`],
    },
    "Processing sidebar message with context"
  );

  await setThreadStatus(client, threadContext, "Thinking...");

  const deps = createSidebarDeps();

  let response: SidebarResponse | null = null;
  try {
    response = await handleSidebarSearch(
      {
        query,
        context,
        accessControlIds: [userId, `team:${sidebarContext.teamId}`],
      },
      deps
    );
  } catch (error) {
    logger.error(
      {
        connectorId,
        query,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      "Failed to generate sidebar response"
    );
    await setThreadStatus(client, threadContext, "");
    return { processed: false, reason: "search_error" };
  }

  if (response) {
    const blocks = buildSidebarResponseBlocks(response);

    await client.call("chat.postMessage", {
      channel: event.channel,
      thread_ts: event.thread_ts,
      text: truncateForSlack(response.content),
      blocks,
    });
  } else {
    await client.call("chat.postMessage", {
      channel: event.channel,
      thread_ts: event.thread_ts,
      text: "I couldn't find relevant information for your question. Please try rephrasing or ask something else.",
    });
  }

  await setThreadStatus(client, threadContext, "");

  return { processed: true, operation: "sidebar_response" };
}
