import { randomUUID } from "node:crypto";
import {
  type DriveWatchChannel,
  DriveWatchChannelSchema,
} from "@openbeam/types/services/connectors/google-drive";
import type { GoogleDriveClient } from "../client";

export interface WatchChangesOptions {
  pageToken: string;
  webhookUrl: string;
  channelId?: string;
  token?: string;
  expiration?: number;
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
}

export interface WatchResult {
  channelId: string;
  resourceId: string;
  expiration: number;
}

export async function watchChanges(
  client: GoogleDriveClient,
  options: WatchChangesOptions
): Promise<WatchResult> {
  const {
    pageToken,
    webhookUrl,
    channelId = randomUUID(),
    token,
    expiration,
    includeItemsFromAllDrives = true,
    supportsAllDrives = true,
  } = options;

  const params: Record<string, string | number | boolean | undefined> = {
    pageToken,
    includeItemsFromAllDrives,
    supportsAllDrives,
  };

  const body: Record<string, string | boolean | undefined> = {
    id: channelId,
    type: "web_hook",
    address: webhookUrl,
    token,
    payload: true,
  };

  if (expiration) {
    body.expiration = String(expiration);
  }

  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) {
      searchParams.set(k, String(v));
    }
  }

  const response = await client.post<DriveWatchChannel>(
    `/changes/watch?${searchParams.toString()}`,
    body
  );

  const parsed = DriveWatchChannelSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Invalid watch channel response");
  }

  const channel = parsed.data;
  const expirationMs = channel.expiration
    ? Number.parseInt(channel.expiration, 10)
    : Date.now() + 7 * 24 * 60 * 60 * 1000;

  return {
    channelId: channel.id,
    resourceId: channel.resourceId ?? "",
    expiration: expirationMs,
  };
}

export interface StopWatchOptions {
  channelId: string;
  resourceId: string;
}

export async function stopWatch(
  client: GoogleDriveClient,
  options: StopWatchOptions
): Promise<void> {
  const { channelId, resourceId } = options;

  await client.post("/channels/stop", {
    id: channelId,
    resourceId,
  });
}

export function parseWebhookHeaders(headers: Record<string, string>): {
  channelId: string;
  resourceId: string;
  resourceState: string;
  messageNumber: number;
  channelToken?: string;
  expiration?: number;
} | null {
  const channelId = headers["x-goog-channel-id"];
  const resourceId = headers["x-goog-resource-id"];
  const resourceState = headers["x-goog-resource-state"];
  const messageNumber = headers["x-goog-message-number"];

  if (!(channelId && resourceId && resourceState)) {
    return null;
  }

  const channelToken = headers["x-goog-channel-token"];
  const expiration = headers["x-goog-channel-expiration"];

  return {
    channelId,
    resourceId,
    resourceState,
    messageNumber: messageNumber ? Number.parseInt(messageNumber, 10) : 0,
    channelToken,
    expiration: expiration ? new Date(expiration).getTime() : undefined,
  };
}

export function isWatchExpiringSoon(
  expirationMs: number,
  bufferMs = 60 * 60 * 1000
): boolean {
  return Date.now() >= expirationMs - bufferMs;
}

export function calculateWatchRenewalTime(
  expirationMs: number,
  bufferMs = 60 * 60 * 1000
): number {
  return Math.max(0, expirationMs - bufferMs - Date.now());
}
