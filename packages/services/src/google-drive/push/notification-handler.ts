import { logger } from "../../lib/logger";
import { parseWebhookHeaders } from "../api/watch";
import {
  type DriveWatchState,
  getAllActiveWatches,
  getWatchStateForConnector,
} from "./watch-manager";

export interface DriveNotification {
  channelId: string;
  resourceId: string;
  resourceState:
    | "sync"
    | "change"
    | "add"
    | "remove"
    | "update"
    | "trash"
    | "untrash";
  messageNumber: number;
  channelToken?: string;
  expiration?: number;
}

export interface NotificationResult {
  processed: boolean;
  shouldSync: boolean;
  connectorId?: string;
  startPageToken?: string;
  error?: string;
}

export function parseNotification(
  headers: Record<string, string>
): DriveNotification | null {
  const parsed = parseWebhookHeaders(headers);
  if (!parsed) {
    return null;
  }

  return {
    channelId: parsed.channelId,
    resourceId: parsed.resourceId,
    resourceState: parsed.resourceState as DriveNotification["resourceState"],
    messageNumber: parsed.messageNumber,
    channelToken: parsed.channelToken,
    expiration: parsed.expiration,
  };
}

export async function handleNotification(
  notification: DriveNotification,
  connectorLookup: Map<string, string>
): Promise<NotificationResult> {
  const connectorId = connectorLookup.get(notification.channelId);

  if (!connectorId) {
    const watchState = await findConnectorByChannelId(notification.channelId);
    if (!watchState) {
      logger.warn(
        { channelId: notification.channelId },
        "Unknown Google Drive notification channel"
      );
      return {
        processed: false,
        shouldSync: false,
        error: "Unknown channel",
      };
    }

    connectorLookup.set(notification.channelId, watchState.connectorId);
    return processNotification(notification, watchState);
  }

  const watchState = await getWatchStateForConnector(connectorId);
  if (!watchState) {
    logger.warn(
      { connectorId, channelId: notification.channelId },
      "No watch state for Google Drive connector"
    );
    return {
      processed: false,
      shouldSync: false,
      error: "No watch state",
    };
  }

  return processNotification(notification, watchState);
}

function processNotification(
  notification: DriveNotification,
  watchState: DriveWatchState
): NotificationResult {
  if (notification.resourceState === "sync") {
    logger.info(
      {
        connectorId: watchState.connectorId,
        channelId: notification.channelId,
      },
      "Google Drive watch sync confirmation received"
    );
    return {
      processed: true,
      shouldSync: false,
      connectorId: watchState.connectorId,
    };
  }

  const syncStates = ["change", "add", "remove", "update", "trash", "untrash"];
  if (syncStates.includes(notification.resourceState)) {
    logger.info(
      {
        connectorId: watchState.connectorId,
        channelId: notification.channelId,
        resourceState: notification.resourceState,
        messageNumber: notification.messageNumber,
      },
      "Google Drive change notification received"
    );

    return {
      processed: true,
      shouldSync: true,
      connectorId: watchState.connectorId,
      startPageToken: watchState.startPageToken,
    };
  }

  logger.debug(
    {
      connectorId: watchState.connectorId,
      resourceState: notification.resourceState,
    },
    "Ignoring Google Drive notification"
  );

  return {
    processed: true,
    shouldSync: false,
    connectorId: watchState.connectorId,
  };
}

async function findConnectorByChannelId(
  channelId: string
): Promise<DriveWatchState | null> {
  const watches = await getAllActiveWatches();
  return watches.find((w) => w.channelId === channelId) ?? null;
}

export function validateNotificationSignature(
  headers: Record<string, string>,
  expectedToken?: string
): boolean {
  if (!expectedToken) {
    return true;
  }

  const receivedToken = headers["x-goog-channel-token"];
  return receivedToken === expectedToken;
}

export function isExpiredNotification(
  notification: DriveNotification,
  bufferMs = 5 * 60 * 1000
): boolean {
  if (!notification.expiration) {
    return false;
  }

  return Date.now() > notification.expiration + bufferMs;
}
