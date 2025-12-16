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
  text?: string;
  ts: string;
  thread_ts?: string;
}

interface SidebarMessageResult {
  processed: boolean;
  operation?: string;
  reason?: string;
}

export async function isAssistantThreadMessage(
  event: MessageEvent
): Promise<SidebarThreadContext | null> {
  if (event.channel_type !== "im" || !event.thread_ts) {
    return null;
  }

  const contextKey = getSidebarContextKey(event.channel, event.thread_ts);
  const context = await getSidebarContext(contextKey);

  return context;
}

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

  const connector = await getConnectorForSync(prisma, connectorId);
  if (!connector) {
    logger.warn({ connectorId }, "Connector not found for sidebar message");
    return { processed: false, reason: "connector_not_found" };
  }

  if (connector.status !== "ACTIVE") {
    return { processed: false, reason: "connector_inactive" };
  }

  const { client } = createSlackClientFromConnector(connector);
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

  logger.debug(
    {
      connectorId,
      channelId: event.channel,
      threadTs: event.thread_ts,
      query,
    },
    "Processing sidebar message"
  );

  await setThreadStatus(client, threadContext, "Thinking...");

  const context: SidebarContext = {
    channelId: sidebarContext.contextChannelId ?? event.channel,
    channelType: "channel",
    teamId: sidebarContext.teamId,
    userId,
    threadTs: event.thread_ts,
  };

  const deps = {
    searchService: {
      search: async (params: {
        query: string;
        teamId: string;
        accessControlIds: string[];
        limit: number;
      }) => {
        const results = await searchService.searchUnified({
          query: params.query,
          teamId: params.teamId,
          limit: params.limit,
          includeDocuments: true,
          accessControlIds: params.accessControlIds,
        });
        return {
          documents: results.documents.map((doc) => ({
            title: doc.title,
            url: doc.url,
            content: doc.content,
            score: (doc as unknown as { relevance?: number }).relevance ?? 0,
            documentType: doc.document_type,
          })),
        };
      },
    },
    ragService: {
      answer: async (params: {
        query: string;
        teamId: string;
        accessControlIds: string[];
        topK: number;
      }) => {
        const result = await ragAnswer({
          query: params.query,
          teamId: params.teamId,
          accessControlIds: params.accessControlIds,
          topK: params.topK,
        });
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
      { error, connectorId, query },
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
