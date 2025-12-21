import prisma, { ConnectorStatus } from "@openplane/db";
import { addSyncJob } from "@openplane/redis";
import { logger } from "../../lib/logger";
import { type PubSubNotification, parsePubSubNotification } from "../api/watch";
import { getWatchStateForConnector } from "./watch-manager";

export interface NotificationHandlerConfig {
  deduplicationWindowMs?: number;
  syncPriority?: number;
}

const DEFAULT_DEDUP_WINDOW_MS = 5000;

const recentNotifications = new Map<string, number>();

export async function handleGmailNotification(
  notification: PubSubNotification,
  config: NotificationHandlerConfig = {}
): Promise<{ handled: boolean; reason?: string }> {
  const { deduplicationWindowMs = DEFAULT_DEDUP_WINDOW_MS, syncPriority = 2 } =
    config;

  const parsed = parsePubSubNotification(notification);
  if (!parsed) {
    logger.warn(
      { messageId: notification.message.messageId },
      "Failed to parse Gmail push notification data"
    );
    return { handled: false, reason: "invalid_notification" };
  }

  logger.debug(
    { emailAddress: parsed.emailAddress, historyId: parsed.historyId },
    "Gmail push notification parsed"
  );

  const dedupeKey = `${parsed.emailAddress}:${parsed.historyId}`;
  const now = Date.now();

  if (isDuplicateNotification(dedupeKey, now, deduplicationWindowMs)) {
    return { handled: false, reason: "duplicate" };
  }

  recordNotification(dedupeKey, now);

  const connectorId = await findConnectorForEmail(parsed.emailAddress);
  if (!connectorId) {
    logger.warn(
      { emailAddress: parsed.emailAddress },
      "No active Gmail connector found for email address"
    );
    return { handled: false, reason: "connector_not_found" };
  }

  const watchState = await getWatchStateForConnector(connectorId);
  if (!watchState) {
    logger.warn(
      { connectorId, emailAddress: parsed.emailAddress },
      "Gmail notification received but no active watch"
    );
  }

  await addSyncJob({
    connectorId,
    syncJobId: "",
    type: "INCREMENTAL",
    trigger: "WEBHOOK",
    priority: syncPriority,
  });

  logger.info(
    {
      connectorId,
      historyId: parsed.historyId,
      emailAddress: parsed.emailAddress,
    },
    "Gmail push notification processed"
  );

  return { handled: true };
}

async function findConnectorForEmail(
  emailAddress: string
): Promise<string | null> {
  // First try to find by config fields
  const connector = await prisma.connector.findFirst({
    where: {
      app: "GMAIL",
      status: {
        in: [ConnectorStatus.ACTIVE, ConnectorStatus.SYNCING],
      },
      OR: [
        {
          config: {
            path: ["userEmail"],
            equals: emailAddress,
          },
        },
        {
          config: {
            path: ["delegatedEmail"],
            equals: emailAddress,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return connector?.id ?? null;
}

function isDuplicateNotification(
  key: string,
  now: number,
  windowMs: number
): boolean {
  const lastSeen = recentNotifications.get(key);
  if (!lastSeen) {
    return false;
  }
  return now - lastSeen < windowMs;
}

function recordNotification(key: string, timestamp: number): void {
  recentNotifications.set(key, timestamp);

  if (recentNotifications.size > 10_000) {
    cleanupOldNotifications(timestamp - 60_000);
  }
}

function cleanupOldNotifications(threshold: number): void {
  for (const [key, timestamp] of recentNotifications) {
    if (timestamp < threshold) {
      recentNotifications.delete(key);
    }
  }
}

export function parseWebhookRequest(body: unknown): PubSubNotification | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const data = body as Record<string, unknown>;

  if (
    data.message &&
    typeof data.message === "object" &&
    typeof data.subscription === "string"
  ) {
    const message = data.message as Record<string, unknown>;

    if (
      typeof message.data === "string" &&
      typeof message.messageId === "string"
    ) {
      return {
        message: {
          data: message.data,
          messageId: message.messageId,
          publishTime:
            (message.publishTime as string) ?? new Date().toISOString(),
        },
        subscription: data.subscription,
      };
    }
  }

  return null;
}

export async function processNotificationBatch(
  notifications: PubSubNotification[],
  config: NotificationHandlerConfig = {}
): Promise<{ processed: number; skipped: number; errors: number }> {
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const notification of notifications) {
    try {
      const result = await handleGmailNotification(notification, config);
      if (result.handled) {
        processed += 1;
      } else {
        skipped += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return { processed, skipped, errors };
}
