import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import { getFormSession, resumeForm } from "../forms";
import type { ResolvedIdentity } from "../identity/resolver";
import { handleAction } from "./action";
import { routeWithAgent } from "./agent-router";
import { handleAsk } from "./ask";
import { handleDocumentUpload } from "./document-handler";
import { handleExpert } from "./expert";
import { handleHelp } from "./help";
import { handleImageMessage } from "./image-handler";
import { handleSearch } from "./search";
import { handleVoiceMessage } from "./voice-handler";

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

const MIN_MEANINGFUL_LENGTH = 10;

export async function routeMessage(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const attachmentResponse = await routeAttachment(message, identity);
  if (attachmentResponse) {
    return attachmentResponse;
  }

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
    return await hybridRoute(message, identity);
  }

  return { type: "text", text: "Mention me or use a command to get started." };
}

async function hybridRoute(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const text = message.text.trim();

  const conversationKey = `${message.channelId}:${message.platformUserId}`;
  const formSession = await getFormSession(message.platform, conversationKey);
  if (formSession) {
    return resumeForm(formSession.state, formSession.fields, text);
  }

  if (GREETING_RE.test(text)) {
    return handleGreeting();
  }

  if (text.length < MIN_MEANINGFUL_LENGTH) {
    return {
      type: "text",
      text: "Could you provide more detail? Try asking a question or using a command.",
      followUps: ["help", "search <query>", "ask <question>"],
    };
  }

  try {
    return await routeWithAgent(message, identity);
  } catch {
    return regexFallback(message, identity);
  }
}

function regexFallback(
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

async function routeAttachment(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse | null> {
  const attachment = message.attachments?.[0];
  if (!attachment) {
    return null;
  }

  switch (attachment.type) {
    case "audio":
      return await handleVoiceMessage(message, identity);
    case "image":
      return await handleImageMessage(message, identity);
    case "document":
    case "file":
      return await handleDocumentUpload(message, identity);
    default:
      return null;
  }
}
