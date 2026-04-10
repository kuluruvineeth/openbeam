import db from "@openbeam/db";
import { getRedisClient } from "@openbeam/redis";
import type { BotPlatform } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";

const DEDUP_TTL = 3600;
const COUNTER_TTL = 30 * 86_400;

export type FeedbackRating = "up" | "down";

interface FeedbackParams {
  platform: BotPlatform;
  platformUserId: string;
  responseId: string;
  rating: FeedbackRating;
  identity: ResolvedIdentity;
}

export async function handleFeedback(
  params: FeedbackParams
): Promise<"ok" | "duplicate" | "error"> {
  const { platform, platformUserId, responseId, rating, identity } = params;
  const redis = await getRedisClient();

  const dedupKey = `fb:dedup:${platform}:${platformUserId}:${responseId}`;
  const wasSet = await redis.set(dedupKey, "1", { NX: true, EX: DEDUP_TTL });
  if (!wasSet) {
    return "duplicate";
  }

  const feedbackType = rating === "up" ? "HELPFUL" : "NOT_HELPFUL";

  await db.userFeedback
    .create({
      data: {
        teamId: identity.teamId,
        userId: identity.userId,
        sessionId: responseId,
        type: feedbackType,
        metadata: { platform, responseId },
      },
    })
    .catch(() => "error" as const);

  const counterKey = `fb:count:${identity.teamId}:${feedbackType}`;
  await redis.incr(counterKey);
  await redis.expire(counterKey, COUNTER_TTL);

  return "ok";
}

export function parseFeedbackAction(value: string): {
  rating: FeedbackRating;
  responseId: string;
} | null {
  if (value.startsWith("up:")) {
    return { rating: "up", responseId: value.slice(3) };
  }
  if (value.startsWith("down:")) {
    return { rating: "down", responseId: value.slice(5) };
  }
  return null;
}

export function parseFeedbackCallbackData(data: string): {
  rating: FeedbackRating;
  responseId: string;
} | null {
  if (data.startsWith("fb:up:")) {
    return { rating: "up", responseId: data.slice(6) };
  }
  if (data.startsWith("fb:dn:")) {
    return { rating: "down", responseId: data.slice(6) };
  }
  return null;
}

export function parseWhatsAppFeedbackId(buttonId: string): {
  rating: FeedbackRating;
  responseId: string;
} | null {
  if (buttonId.startsWith("fb_up_")) {
    return { rating: "up", responseId: buttonId.slice(6) };
  }
  if (buttonId.startsWith("fb_dn_")) {
    return { rating: "down", responseId: buttonId.slice(6) };
  }
  return null;
}
