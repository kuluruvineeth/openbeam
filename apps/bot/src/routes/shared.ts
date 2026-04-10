import db from "@openbeam/db";
import { getRedisClient } from "@openbeam/redis";
import type {
  BotResponse,
  PlatformAdapter,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { handleFeedback, parseWhatsAppFeedbackId } from "../handlers/feedback";
import { routeMessage } from "../handlers/router";
import { handleStreamAsk } from "../handlers/stream-ask";
import { sendLinkPrompt } from "../identity/linking";
import { resolveIdentity } from "../identity/resolver";
import { checkTeamRateLimit, checkUserRateLimit } from "../lib/rate-limit";

const noop = Function.prototype as () => void;

const STREAMING_PLATFORMS = new Set(["SLACK", "DISCORD", "TELEGRAM", "TEAMS"]);

async function recordPlatformActivity(
  teamId: string,
  userId: string,
  platform: string
): Promise<void> {
  const redis = await getRedisClient();
  await redis.set(
    `notif:activity:${teamId}:${userId}:${platform}`,
    String(Date.now()),
    { EX: 86_400 }
  );
}

function isAskLikeQuery(message: UnifiedMessage): boolean {
  if (message.command === "ask") {
    return true;
  }
  if (message.command) {
    return false;
  }
  if (message.isDirectMessage || message.isMention) {
    const text = message.text.trim();
    return text.endsWith("?") || text.length > 20;
  }
  return false;
}

export async function resolveAndRoute(
  adapter: PlatformAdapter,
  message: UnifiedMessage
): Promise<BotResponse | null> {
  const userLimit = checkUserRateLimit(
    message.platform,
    message.platformUserId
  );
  if (!userLimit.allowed) {
    return {
      type: "error",
      text: `Too many requests. Try again in ${userLimit.retryAfterSeconds}s.`,
    };
  }

  const identity = await resolveIdentity(db, message);

  if (!identity) {
    await sendLinkPrompt(db, adapter, message);
    return null;
  }

  recordPlatformActivity(
    identity.teamId,
    identity.userId,
    message.platform
  ).catch(noop);

  const teamLimit = checkTeamRateLimit(identity.teamId);
  if (!teamLimit.allowed) {
    return {
      type: "error",
      text: `Too many requests. Try again in ${teamLimit.retryAfterSeconds}s.`,
    };
  }

  const whatsAppFeedback = parseWhatsAppFeedbackId(message.text);
  if (whatsAppFeedback) {
    await handleFeedback({
      platform: message.platform,
      platformUserId: message.platformUserId,
      responseId: whatsAppFeedback.responseId,
      rating: whatsAppFeedback.rating,
      identity,
    });
    return { type: "text" as const, text: "Thanks for your feedback!" };
  }

  await adapter.sendTypingIndicator(
    message.channelId,
    message.threadId,
    message.id
  );

  try {
    if (STREAMING_PLATFORMS.has(message.platform) && isAskLikeQuery(message)) {
      const streamResult = await handleStreamAsk(message, identity, adapter);
      if (!streamResult) {
        return null;
      }
      return streamResult;
    }

    return await routeMessage(message, identity);
  } catch (error) {
    console.error("handler error", error);
    return {
      type: "error" as const,
      text: "Something went wrong processing your request. Please try again.",
    };
  }
}

export async function standardWebhook(
  adapter: PlatformAdapter,
  rawBody: string,
  headers: Record<string, string>
): Promise<{ ok: boolean; error?: string; status: number }> {
  if (!(await adapter.verifySignature(rawBody, headers))) {
    return { ok: false, error: "invalid signature", status: 401 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "invalid json", status: 400 };
  }

  const message = await adapter.parseEvent(parsed, headers);
  if (!message) {
    return { ok: true, status: 200 };
  }

  const response = await resolveAndRoute(adapter, message);
  if (response) {
    await adapter.sendResponse(message, response);
  }

  return { ok: true, status: 200 };
}

export function extractHeaders(raw: Headers): Record<string, string> {
  return Object.fromEntries(raw.entries());
}
