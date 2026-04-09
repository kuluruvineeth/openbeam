import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";
import { handleAction } from "./action";
import { handleAsk } from "./ask";
import { handleExpert } from "./expert";
import { handleHelp } from "./help";
import { handleSearch } from "./search";

type Handler = (
  msg: UnifiedMessage,
  id: ResolvedIdentity
) => Promise<BotResponse>;

const COMMAND_HANDLERS: Record<string, Handler> = {
  search: handleSearch,
  ask: handleAsk,
  expert: handleExpert,
  action: handleAction,
};

const GREETING_RE =
  /^(?:hi|hello|hey|howdy|yo|sup|hola|greetings|good\s+(?:morning|afternoon|evening))[\s!.,?]*$/i;

const INTENT_PATTERNS: [RegExp, string][] = [
  [/^(?:search|find|look\s?up)\b/i, "search"],
  [/^(?:who\s+(?:is|knows|works\s+on))\b/i, "expert"],
  [/\?$/i, "ask"],
];

export async function routeMessage(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  if (message.command) {
    if (message.command === "help") {
      return handleHelp();
    }
    const handler = COMMAND_HANDLERS[message.command];
    if (handler) {
      return await handler(message, identity);
    }
  }

  if (message.isDirectMessage || message.isMention) {
    return await detectAndRoute(message, identity);
  }

  return { type: "text", text: "Mention me or use a command to get started." };
}

function detectAndRoute(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const text = message.text.trim();

  if (GREETING_RE.test(text)) {
    return Promise.resolve(handleGreeting());
  }

  for (const [pattern, intent] of INTENT_PATTERNS) {
    if (pattern.test(text)) {
      const handler = COMMAND_HANDLERS[intent];
      if (handler) {
        return handler(message, identity);
      }
    }
  }

  return handleAsk(message, identity);
}

function handleGreeting(): BotResponse {
  return {
    type: "text",
    text: [
      "Hey! I'm OpenBeam — your enterprise search assistant.",
      "",
      "Try one of these:",
      "  ask <question> — Get an AI answer with sources",
      "  search <query> — Search across your tools",
      "  expert <topic> — Find who knows what",
      "  help — Full command list",
      "",
      "Or just ask me anything directly.",
    ].join("\n"),
  };
}
