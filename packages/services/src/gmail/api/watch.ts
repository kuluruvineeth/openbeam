import {
  type GmailWatchResponse,
  GmailWatchResponseSchema,
} from "@openbeam/types/services/connectors/gmail";
import type { GmailClient } from "../client";

export interface WatchRequest {
  topicName: string;
  labelIds?: string[];
  labelFilterBehavior?: "include" | "exclude";
}

export interface WatchState {
  historyId: string;
  expiration: number;
  topicName: string;
  connectorId: string;
}

export async function setupWatch(
  client: GmailClient,
  request: WatchRequest
): Promise<GmailWatchResponse | null> {
  const body: Record<string, unknown> = {
    topicName: request.topicName,
  };

  if (request.labelIds?.length) {
    body.labelIds = request.labelIds;
    body.labelFilterBehavior = request.labelFilterBehavior ?? "include";
  }

  const response = await client.post<GmailWatchResponse>(
    "/users/me/watch",
    body
  );

  const parsed = GmailWatchResponseSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function stopWatch(client: GmailClient): Promise<void> {
  await client.post("/users/me/stop");
}

export function parseWatchExpiration(expiration: string): number {
  return Number.parseInt(expiration, 10);
}

export function isWatchExpiringSoon(
  expirationMs: number,
  bufferHours = 24
): boolean {
  const bufferMs = bufferHours * 60 * 60 * 1000;
  return Date.now() >= expirationMs - bufferMs;
}

export function getWatchRenewalTime(expirationMs: number): number {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return expirationMs - oneDayMs;
}

export const WATCH_EXPIRATION_DAYS = 7;
export const WATCH_RENEWAL_BUFFER_HOURS = 24;

export function createWatchState(
  response: GmailWatchResponse,
  topicName: string,
  connectorId: string
): WatchState {
  return {
    historyId: response.historyId,
    expiration: parseWatchExpiration(response.expiration),
    topicName,
    connectorId,
  };
}

export interface PubSubNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

export interface GmailPushNotification {
  emailAddress: string;
  historyId: string;
}

export function parsePubSubNotification(
  notification: PubSubNotification
): GmailPushNotification | null {
  try {
    const decoded = Buffer.from(notification.message.data, "base64").toString(
      "utf-8"
    );
    const parsed = JSON.parse(decoded);

    // historyId can be a number or string depending on the notification
    if (
      typeof parsed.emailAddress === "string" &&
      (typeof parsed.historyId === "string" ||
        typeof parsed.historyId === "number")
    ) {
      return {
        emailAddress: parsed.emailAddress,
        historyId: String(parsed.historyId),
      };
    }

    return null;
  } catch {
    return null;
  }
}
