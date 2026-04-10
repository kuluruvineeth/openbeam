import { ragAnswer } from "@openbeam/services";
import type {
  BotResponse,
  Citation,
  UnifiedMessage,
} from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";
import { appendTurn } from "../memory";
import { handleAsk } from "./ask";
import { stripCommandPrefix } from "./utils";

interface StreamCapableAdapter {
  sendStreamPlaceholder(message: UnifiedMessage): Promise<unknown>;
  updateStreamMessage(
    message: UnifiedMessage,
    handle: unknown,
    text: string
  ): Promise<void>;
  finalizeStreamMessage(
    message: UnifiedMessage,
    handle: unknown,
    response: BotResponse
  ): Promise<void>;
}

function isStreamCapable(adapter: unknown): adapter is StreamCapableAdapter {
  const a = adapter as Record<string, unknown>;
  return (
    typeof a.sendStreamPlaceholder === "function" &&
    typeof a.updateStreamMessage === "function" &&
    typeof a.finalizeStreamMessage === "function"
  );
}

export async function handleStreamAsk(
  message: UnifiedMessage,
  identity: ResolvedIdentity,
  adapter: unknown
): Promise<BotResponse | null> {
  if (!isStreamCapable(adapter)) {
    return handleAsk(message, identity);
  }

  const question = stripCommandPrefix(
    message.text,
    message.command === "ask" ? message.command : undefined
  );

  if (question.length < 5) {
    return {
      type: "error",
      text: "Question too short. Please provide more detail.",
    };
  }

  const handle = await adapter.sendStreamPlaceholder(message);
  if (!handle) {
    return handleAsk(message, identity);
  }

  try {
    const result = await ragAnswer({
      query: question,
      teamId: identity.teamId,
    });

    if (!result.answer) {
      await adapter.finalizeStreamMessage(message, handle, {
        type: "text",
        text: "I couldn't find a relevant answer. Try rephrasing your question.",
        responseId: crypto.randomUUID(),
      });
      return null;
    }

    const citations: Citation[] = (result.citations ?? [])
      .slice(0, 5)
      .map((c, i) => ({
        index: i + 1,
        title: c.title ?? "Source",
        url: c.url,
        snippet: c.snippet ?? undefined,
        source: c.connectorType ?? undefined,
      }));

    const channelKey = message.threadId ?? message.channelId;
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

    await appendTurn(turnParams, {
      role: "assistant",
      content: result.answer,
      ts: Date.now(),
    });

    const response: BotResponse = {
      type: "answer",
      text: result.answer,
      title: question,
      citations,
      responseId: crypto.randomUUID(),
      followUps: buildFollowUps(question, citations),
    };

    await adapter.finalizeStreamMessage(message, handle, response);
    return null;
  } catch {
    return handleAsk(message, identity);
  }
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
