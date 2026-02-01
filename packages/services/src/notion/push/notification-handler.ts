import { createHmac, timingSafeEqual } from "node:crypto";
import {
  type NotionWebhookPayload,
  NotionWebhookPayloadSchema,
} from "@openplane/types/services/connectors/notion";
import { logger } from "../../lib/logger";
import { getAllActiveWatches, type NotionWatchState } from "./watch-manager";

export interface NotionNotification {
  payload: NotionWebhookPayload;
  webhookId: string;
  signature: string;
  timestamp: number;
}

export interface NotificationResult {
  processed: boolean;
  connectorId?: string;
  shouldSync: boolean;
  affectedPageIds?: string[];
  affectedDatabaseIds?: string[];
  error?: string;
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch (error) {
    logger.warn({ error }, "Webhook signature verification failed");
    return false;
  }
}

export function parseWebhookPayload(body: string): NotionWebhookPayload | null {
  try {
    const parsed = JSON.parse(body);
    return NotionWebhookPayloadSchema.parse(parsed);
  } catch {
    return null;
  }
}

export async function handleNotification(
  notification: NotionNotification,
  watchStateCache?: Map<string, NotionWatchState>
): Promise<NotificationResult> {
  const { payload, webhookId, signature } = notification;

  let watchState: NotionWatchState | null = null;

  if (watchStateCache?.has(webhookId)) {
    watchState = watchStateCache.get(webhookId) ?? null;
  } else {
    const allStates = await getAllActiveWatches();
    watchState = allStates.find((s) => s.webhookId === webhookId) ?? null;

    if (watchState && watchStateCache) {
      watchStateCache.set(webhookId, watchState);
    }
  }

  if (!watchState) {
    return {
      processed: false,
      shouldSync: false,
      error: "Watch state not found for webhook",
    };
  }

  const isValid = verifyWebhookSignature(
    JSON.stringify(payload),
    signature,
    watchState.webhookSecret
  );

  if (!isValid) {
    return {
      processed: false,
      shouldSync: false,
      connectorId: watchState.connectorId,
      error: "Invalid webhook signature",
    };
  }

  const affectedPageIds: string[] = [];
  const affectedDatabaseIds: string[] = [];

  if (payload.data.page_id) {
    affectedPageIds.push(payload.data.page_id);
  }
  if (payload.data.database_id) {
    affectedDatabaseIds.push(payload.data.database_id);
  }

  const shouldSync = shouldTriggerSync(payload.type);

  return {
    processed: true,
    connectorId: watchState.connectorId,
    shouldSync,
    affectedPageIds: affectedPageIds.length > 0 ? affectedPageIds : undefined,
    affectedDatabaseIds:
      affectedDatabaseIds.length > 0 ? affectedDatabaseIds : undefined,
  };
}

function shouldTriggerSync(eventType: string): boolean {
  const syncTriggerEvents = [
    "page.content_updated",
    "page.created",
    "page.properties_updated",
    "page.restored",
    "page.moved",
    "page.unarchived",
    "database.created",
    "database.content_updated",
    "database.properties_updated",
  ];

  return syncTriggerEvents.includes(eventType);
}

export function isExpiredNotification(
  notification: NotionNotification
): boolean {
  const maxAge = 5 * 60 * 1000;
  return Date.now() - notification.timestamp > maxAge;
}
