import { detectLanguage, ragAnswer } from "@openbeam/services";
import type {
  BotResponse,
  Citation,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { buildMultilingualSystemPrompt } from "../ai/prompts";
import type { ResolvedIdentity } from "../identity/resolver";
import { appendTurn, formatContextForQuery, getSession } from "../memory";
import { stripCommandPrefix } from "./utils";

const CONFIDENCE_VERY_LOW = 0.3;
const CONFIDENCE_LOW = 0.5;
const CONFIDENCE_HIGH = 0.8;

export async function handleAsk(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const question = extractQuestion(message.text, message.command);

  if (question.length < 5) {
    return {
      type: "error",
      text: "Question too short. Please provide more detail.",
    };
  }

  const channelKey = message.threadId ?? message.channelId;
  const session = await getSession(
    message.platform,
    channelKey,
    identity.userId
  );

  const contextPrefix = formatContextForQuery(session);
  const enrichedQuery = contextPrefix
    ? `${contextPrefix}\n\nCurrent question: ${question}`
    : question;

  const lang = detectLanguage(question);
  const systemPrompt =
    lang.iso6391 !== "en"
      ? buildMultilingualSystemPrompt(lang.iso6391)
      : undefined;

  const result = await ragAnswer({
    query: enrichedQuery,
    teamId: identity.teamId,
    systemPrompt,
  });

  const turnParams = {
    platform: message.platform,
    channelId: channelKey,
    userId: identity.userId,
    teamId: identity.teamId,
  };

  await appendTurn(turnParams, {
    role: "user",
    content: question,
    ts: message.timestamp.getTime(),
  });

  if (!result.answer) {
    return {
      type: "text",
      text: "I couldn't find a relevant answer. Try rephrasing your question.",
      responseId: crypto.randomUUID(),
      followUps: [
        `Search for "${question}"`,
        `Find experts on ${question.split(" ").slice(0, 3).join(" ")}`,
      ],
    };
  }

  await appendTurn(turnParams, {
    role: "assistant",
    content: result.answer,
    ts: Date.now(),
  });

  const citations: Citation[] = (result.citations ?? [])
    .slice(0, 5)
    .map((c, i) => ({
      index: i + 1,
      title: c.title ?? "Source",
      url: c.url,
      snippet: c.snippet ?? undefined,
      source: c.connectorType ?? undefined,
    }));

  const confidence = result.confidence ?? 0;

  if (confidence < CONFIDENCE_VERY_LOW) {
    return buildVeryLowConfidenceResponse(question);
  }

  if (confidence < CONFIDENCE_LOW) {
    return buildLowConfidenceResponse(result.answer, citations, confidence);
  }

  return {
    type: "answer",
    text: result.answer,
    title: question,
    citations,
    confidence: confidence >= CONFIDENCE_HIGH ? undefined : confidence,
    responseId: crypto.randomUUID(),
    results: result.citations?.map((c) => ({
      title: c.title ?? "Source",
      snippet: c.snippet ?? "",
      url: c.url,
      source: c.connectorType ?? "unknown",
      score: c.relevanceScore ?? 0,
    })),
    followUps: buildFollowUps(question, citations),
  };
}

function buildVeryLowConfidenceResponse(question: string): BotResponse {
  return {
    type: "text",
    text: "I don't have enough information to answer that confidently.",
    responseId: crypto.randomUUID(),
    followUps: [
      `Search for "${question}"`,
      `Find experts on ${question.split(" ").slice(0, 3).join(" ")}`,
      "Check connected data sources",
    ],
  };
}

function buildLowConfidenceResponse(
  answer: string,
  citations: Citation[],
  confidence: number
): BotResponse {
  return {
    type: "answer",
    text: answer,
    citations,
    confidence,
    responseId: crypto.randomUUID(),
    followUps: ["Search for more results", "Find an expert on this topic"],
  };
}

function extractQuestion(text: string, command?: string): string {
  return stripCommandPrefix(text, command === "ask" ? command : undefined);
}

function buildFollowUps(question: string, citations: Citation[]): string[] {
  const suggestions: string[] = [];
  if (citations.length > 0) {
    suggestions.push("Tell me more about this");
  }
  const words = question.split(" ").filter((w) => w.length > 3);
  if (words.length > 0) {
    suggestions.push(`Search for "${words.slice(0, 4).join(" ")}"`);
  }
  return suggestions.slice(0, 3);
}
