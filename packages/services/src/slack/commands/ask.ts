import {
  cacheAssistantResponse,
  getAssistantResponseKey,
} from "@openbeam/redis";
import { ragAnswer } from "../../ai/rag";
import { buildResponseBlocks } from "../assistant/response-builder";
import type { SlashCommandPayload } from "../interactivity/types";
import type { CommandContext, CommandResult } from "./router";

export async function handleAskCommand(
  payload: SlashCommandPayload,
  context: CommandContext
): Promise<CommandResult> {
  const question = payload.text.trim();

  if (!question) {
    return {
      response_type: "ephemeral",
      text: "Please provide a question.\nUsage: `/openbeam ask <question>`",
    };
  }

  try {
    const result = await ragAnswer({
      query: question,
      teamId: context.teamId,
      accessControlIds: context.accessControlIds,
      topK: 5,
    });

    const citations = result.citations.map((c) => ({
      title: c.title,
      url: c.url,
      snippet: c.snippet,
    }));

    const responseKey = getAssistantResponseKey(
      context.teamId,
      payload.channel_id,
      payload.user_id
    );

    await cacheAssistantResponse(responseKey, {
      query: question,
      answer: result.answer,
      citations,
      confidence: result.citations.length > 0 ? 0.8 : 0.3,
      sources: result.citations.map((c) => c.title),
      isRetry: false,
      teamId: context.teamId,
      accessControlIds: context.accessControlIds,
    });

    const blocks = buildResponseBlocks(
      {
        answer: result.answer,
        citations,
        confidence: result.citations.length > 0 ? 0.8 : 0.3,
        sources: result.citations.map((c) => c.title),
      },
      { showFeedbackButtons: true, responseKey }
    );

    return {
      response_type: "ephemeral",
      text: result.answer,
      blocks,
    };
  } catch (error) {
    return {
      response_type: "ephemeral",
      text: `Failed to answer: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
