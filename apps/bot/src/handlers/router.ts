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

const INTENT_PATTERNS: [RegExp, string][] = [
  [/^(?:search|find|look\s?up)\b/i, "search"],
  [/^(?:who\s+(?:is|knows|works\s+on))\b/i, "expert"],
  [/\?$/i, "ask"],
];

export function routeMessage(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  if (message.command) {
    if (message.command === "help") {
      return handleHelp();
    }
    const handler = COMMAND_HANDLERS[message.command];
    if (handler) {
      return handler(message, identity);
    }
  }

  if (message.isDirectMessage || message.isMention) {
    return detectAndRoute(message, identity);
  }

  return { type: "text", text: "Mention me or use a command to get started." };
}

function detectAndRoute(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const text = message.text.trim();

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
