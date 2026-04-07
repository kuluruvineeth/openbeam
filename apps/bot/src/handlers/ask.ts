import { ragAnswer } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";

const COMMAND_PREFIX_RE = /^\/?\w+\s*/;

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

  const result = await ragAnswer({
    query: question,
    teamId: identity.teamId,
  });

  if (!result.answer) {
    return {
      type: "text",
      text: "I couldn't find a relevant answer. Try rephrasing your question.",
    };
  }

  return {
    type: "answer",
    text: result.answer,
    title: question,
    results: result.citations?.map((c) => ({
      title: c.title ?? "Source",
      snippet: c.snippet ?? "",
      url: c.url,
      source: c.connectorType ?? "unknown",
      score: c.relevanceScore ?? 0,
    })),
  };
}

function extractQuestion(text: string, command?: string): string {
  if (command === "ask") {
    return text.replace(COMMAND_PREFIX_RE, "").trim();
  }
  return text.trim();
}
