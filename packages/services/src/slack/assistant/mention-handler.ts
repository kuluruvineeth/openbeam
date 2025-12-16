import { ragAnswer } from "../../ai/rag";
import { logger } from "../../lib/logger";
import { addReaction } from "../api/reactions";
import type { SlackClient } from "../client";
import type { AppMentionEvent } from "../events/types";
import { buildEphemeralPayload } from "./response-builder";
import type {
  AssistantContext,
  AssistantHandlerResult,
  AssistantResponse,
} from "./types";
import { REACTION_EMOJIS } from "./types";

interface ChatPostEphemeralResponse {
  ok: boolean;
  message_ts?: string;
  error?: string;
}

const MENTION_PATTERN = /<@[A-Z0-9]+>/gi;
const WHITESPACE_PATTERN = /\s+/g;

export async function handleAppMention(
  client: SlackClient,
  event: AppMentionEvent,
  context: AssistantContext
): Promise<AssistantHandlerResult> {
  logger.debug(
    {
      eventText: event.text,
      channel: event.channel,
      user: event.user,
      teamId: context.teamId,
    },
    "handleAppMention starting"
  );

  const query = extractQueryFromMention(event.text);
  logger.debug(
    { query, queryLength: query.length },
    "handleAppMention extracted query"
  );

  if (!query || query.length < 3) {
    logger.debug("handleAppMention: Query too short, skipping");
    return { handled: false };
  }

  try {
    if (context.reactionsEnabled) {
      logger.debug("handleAppMention: Adding reaction");
      await addReaction(
        client,
        event.channel,
        event.ts,
        REACTION_EMOJIS.suggestion_made
      );
    }

    logger.debug("handleAppMention: Generating RAG response");
    const response = await generateAssistantResponse(query, context);
    logger.debug(
      {
        answerLength: response.answer.length,
        citationsCount: response.citations.length,
        confidence: response.confidence,
        latencyMs: response.latencyMs,
      },
      "handleAppMention RAG response received"
    );

    const ephemeral = buildEphemeralPayload(response, {
      showFeedbackButtons: true,
      threadTs: event.thread_ts,
    });

    logger.debug(
      {
        channel: event.channel,
        user: event.user,
        textPreview: ephemeral.text.slice(0, 100),
        blocksCount: ephemeral.blocks.length,
      },
      "handleAppMention posting ephemeral message"
    );

    const postResult = await client.call<ChatPostEphemeralResponse>(
      "chat.postEphemeral",
      {
        channel: event.channel,
        user: event.user,
        text: ephemeral.text,
        blocks: ephemeral.blocks,
        thread_ts: event.thread_ts ?? event.ts,
      }
    );

    logger.debug(
      {
        ok: postResult.ok,
        messageTs: postResult.message_ts,
        error: postResult.error,
      },
      "handleAppMention ephemeral post result"
    );

    return { handled: true, response };
  } catch (error) {
    logger.error({ error }, "handleAppMention error");
    return {
      handled: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export interface AutoQuestionParams {
  client: SlackClient;
  channelId: string;
  messageTs: string;
  userId: string;
  query: string;
  context: AssistantContext;
}

export async function handleAutoQuestion(
  params: AutoQuestionParams
): Promise<AssistantHandlerResult> {
  const { client, channelId, messageTs, userId, query, context } = params;

  try {
    if (context.reactionsEnabled) {
      await addReaction(
        client,
        channelId,
        messageTs,
        REACTION_EMOJIS.suggestion_made
      );
    }

    const response = await generateAssistantResponse(query, context);

    if (response.confidence < 0.5) {
      return { handled: false };
    }

    const ephemeral = buildEphemeralPayload(response, {
      showFeedbackButtons: true,
    });

    await client.call<ChatPostEphemeralResponse>("chat.postEphemeral", {
      channel: channelId,
      user: userId,
      text: ephemeral.text,
      blocks: ephemeral.blocks,
      thread_ts: messageTs,
    });

    return { handled: true, response };
  } catch (error) {
    return {
      handled: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

async function generateAssistantResponse(
  query: string,
  context: AssistantContext
): Promise<AssistantResponse> {
  const startTime = Date.now();

  const result = await ragAnswer({
    query,
    teamId: context.teamId,
    accessControlIds: context.accessControlIds,
    topK: 5,
    includeMetadata: true,
  });

  const confidence = calculateConfidence(result);

  return {
    answer: result.answer,
    citations: result.citations.map((c) => ({
      title: c.title,
      url: c.url,
      snippet: c.snippet,
      documentId: c.documentId,
    })),
    confidence,
    sources: result.citations.map((c) => c.title),
    latencyMs: Date.now() - startTime,
  };
}

function calculateConfidence(result: {
  answer: string;
  citations: unknown[];
}): number {
  let confidence = 0.3;

  if (result.citations.length > 0) {
    confidence += Math.min(result.citations.length * 0.15, 0.45);
  }

  if (result.answer.length > 100) {
    confidence += 0.1;
  }

  const genericPhrases = [
    "i couldn't find",
    "no relevant",
    "i don't have",
    "not enough information",
  ];

  const lowerAnswer = result.answer.toLowerCase();
  for (const phrase of genericPhrases) {
    if (lowerAnswer.includes(phrase)) {
      confidence *= 0.5;
      break;
    }
  }

  return Math.min(confidence, 1);
}

function extractQueryFromMention(text: string): string {
  return text
    .replace(MENTION_PATTERN, "")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}
