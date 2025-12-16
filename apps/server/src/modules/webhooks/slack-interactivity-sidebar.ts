import prisma, { createSlackFeedback } from "@openplane/db";
import {
  cacheAssistantResponse,
  getAssistantResponse,
  getAssistantResponseKey,
  getSidebarContext,
  getSidebarContextKey,
} from "@openplane/redis";
import {
  buildResponseBlocks,
  buildSharedResponseBlocks,
  buildSidebarResponseBlocks,
  handleSidebarPromptSelect,
  ragAnswer,
  SIDEBAR_CALLBACK_IDS,
  searchService,
  setThreadStatus,
  truncateForSlack,
} from "@openplane/services";
import logger from "../../utils/logger";
import type {
  BlockActionPayload,
  HandlerContext,
  SidebarContext,
} from "./slack-interactivity-types";
import { getSlackClient } from "./slack-interactivity-utils";

export async function handleSidebarPromptAction(
  ctx: HandlerContext,
  actionId: string,
  payload: BlockActionPayload
): Promise<void> {
  const promptId = actionId.replace(
    `${SIDEBAR_CALLBACK_IDS.PROMPT_SELECT}_`,
    ""
  );
  const threadTs = payload.message?.thread_ts ?? payload.message?.ts;
  const channelId = payload.channel?.id ?? ctx.channelId;

  if (!(channelId && threadTs)) {
    logger.warn(
      { actionId, ctx },
      "Missing channel or thread context for sidebar prompt"
    );
    return;
  }

  const cacheKey = getSidebarContextKey(channelId, threadTs);
  const cachedContext = await getSidebarContext(cacheKey);

  if (!cachedContext) {
    logger.warn({ cacheKey, actionId }, "Sidebar context not found in cache");
    return;
  }

  const client = await getSlackClient(ctx.connectorId, ctx.teamId);
  const threadContext = {
    channelId,
    threadTs,
    userId: ctx.userId,
  };

  await setThreadStatus(client, threadContext, "Searching...");

  const sidebarContext: SidebarContext = {
    channelId: cachedContext.contextChannelId ?? channelId,
    channelType: "channel",
    teamId: cachedContext.teamId,
    userId: ctx.userId,
    threadTs,
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

  const response = await handleSidebarPromptSelect(
    {
      promptId,
      context: sidebarContext,
      accessControlIds: [ctx.userId, `team:${ctx.teamId}`],
    },
    deps
  );

  if (response) {
    const blocks = buildSidebarResponseBlocks(response);

    await client.call("chat.postMessage", {
      channel: channelId,
      thread_ts: threadTs,
      text: truncateForSlack(response.content),
      blocks,
    });
  }

  await setThreadStatus(client, threadContext, "");
}

export async function handleFeedbackAction(
  ctx: HandlerContext,
  messageTs: string,
  feedbackType: string,
  responseKey?: string
): Promise<void> {
  let query = "";
  let response = "";

  if (responseKey) {
    const cached = await getAssistantResponse(responseKey);
    if (cached) {
      query = cached.query;
      response = cached.answer;
    }
  }

  await createSlackFeedback(prisma, {
    connectorId: ctx.connectorId,
    userId: ctx.userId,
    channelId: ctx.channelId ?? "",
    messageTs,
    query,
    response,
    feedbackType,
  });
}

export async function handleNotHelpfulRetry(
  _ctx: HandlerContext,
  responseKey: string,
  responseUrl?: string
): Promise<boolean> {
  const cached = await getAssistantResponse(responseKey);

  if (!cached || cached.isRetry || !cached.teamId || !cached.accessControlIds) {
    return false;
  }

  if (!responseUrl) {
    logger.warn("No response_url for retry");
    return false;
  }

  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replace_original: true,
        text: "Searching with more context...",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":mag: _Searching with more context..._",
            },
          },
        ],
      }),
    });

    const result = await ragAnswer({
      query: cached.query,
      teamId: cached.teamId,
      accessControlIds: cached.accessControlIds,
      topK: 25,
    });

    const citations = result.citations.map((c) => ({
      title: c.title,
      url: c.url,
      snippet: c.snippet,
    }));

    const newResponseKey = getAssistantResponseKey(
      cached.teamId,
      cached.query,
      Date.now().toString()
    );

    await cacheAssistantResponse(newResponseKey, {
      query: cached.query,
      answer: result.answer,
      citations,
      confidence: result.citations.length > 0 ? 0.8 : 0.3,
      sources: result.citations.map((c) => c.title),
      teamId: cached.teamId,
      accessControlIds: cached.accessControlIds,
      isRetry: true,
    });

    const blocks = buildResponseBlocks(
      {
        answer: result.answer,
        citations,
        confidence: result.citations.length > 0 ? 0.8 : 0.3,
        sources: result.citations.map((c) => c.title),
      },
      { showFeedbackButtons: true, responseKey: newResponseKey }
    );

    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replace_original: true,
        text: truncateForSlack(result.answer),
        blocks,
      }),
    });

    return true;
  } catch (error) {
    logger.error({ error }, "Failed to retry with expanded search");
    return false;
  }
}

export async function handleShareResponse(
  ctx: HandlerContext,
  responseKey: string | undefined,
  message: BlockActionPayload["message"],
  responseUrl?: string
): Promise<{ shared: boolean; error?: string }> {
  if (!responseKey) {
    return { shared: false, error: "No response key provided" };
  }

  const cached = await getAssistantResponse(responseKey);
  if (!cached) {
    return { shared: false, error: "Response expired or not found" };
  }

  const client = await getSlackClient(ctx.connectorId, ctx.teamId);

  const sharedBlocks = buildSharedResponseBlocks(
    {
      answer: cached.answer,
      citations: cached.citations,
      confidence: cached.confidence,
      sources: cached.sources,
    },
    ctx.userId
  );

  await client.call("chat.postMessage", {
    channel: ctx.channelId,
    text: truncateForSlack(cached.answer),
    blocks: sharedBlocks,
  });

  if (responseUrl) {
    const updatedBlocks = (message?.blocks ?? []).filter(
      (block) => (block as { type?: string }).type !== "actions"
    );
    updatedBlocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: "✓ _Shared to channel_" }],
    });

    try {
      const response = await fetch(responseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replace_original: true,
          text: truncateForSlack(cached.answer),
          blocks: updatedBlocks,
        }),
      });

      if (!response.ok) {
        logger.warn(
          { status: response.status },
          "Failed to update shared message confirmation via response_url"
        );
      }
    } catch (error) {
      logger.warn({ error }, "Failed to update shared message confirmation");
    }
  }

  return { shared: true };
}

export async function updateFeedbackMessage(
  _ctx: HandlerContext,
  message: BlockActionPayload["message"],
  responseUrl?: string
): Promise<void> {
  if (!responseUrl) {
    logger.warn("No response_url available to update feedback message");
    return;
  }

  const updatedBlocks = (message?.blocks ?? []).filter(
    (block) => (block as { type?: string }).type !== "actions"
  );
  updatedBlocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "✓ _Thanks for your feedback_" }],
  });

  try {
    const response = await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        replace_original: true,
        blocks: updatedBlocks,
      }),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        "Failed to update feedback message via response_url"
      );
    }
  } catch (error) {
    logger.warn({ error }, "Failed to update feedback message");
  }
}
