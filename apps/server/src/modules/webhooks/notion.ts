import { rateLimiter } from "@openbeam/redis";
import {
  getNotionWatchState,
  handleNotionNotification,
  isExpiredNotionNotification,
  type NotionNotification,
  type NotionWatchState,
  parseNotionWebhookPayload,
  verifyNotionWebhookSignature,
} from "@openbeam/services";
import { startConnectorSync } from "@openbeam/temporal";
import { Hono } from "hono";
import logger from "../../utils/logger";

const notionWebhook = new Hono();

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 1000;

class TTLMap<K, V> extends Map<K, V> {
  private readonly expirations = new Map<K, number>();

  override get(key: K): V | undefined {
    const expiry = this.expirations.get(key);
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return;
    }
    return super.get(key);
  }

  override has(key: K): boolean {
    const expiry = this.expirations.get(key);
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return false;
    }
    return super.has(key);
  }

  override set(key: K, value: V): this {
    if (this.size >= MAX_CACHE_SIZE && !super.has(key)) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }
    this.expirations.set(key, Date.now() + CACHE_TTL_MS);
    return super.set(key, value);
  }

  override delete(key: K): boolean {
    this.expirations.delete(key);
    return super.delete(key);
  }

  override clear(): void {
    this.expirations.clear();
    super.clear();
  }
}

const webhookConnectorCache = new TTLMap<string, NotionWatchState>();

notionWebhook.post("/push/:connectorId", async (c) => {
  try {
    const connectorId = c.req.param("connectorId");
    const signature = c.req.header("X-Notion-Signature") ?? "";
    const webhookId = c.req.header("X-Notion-Webhook-Id") ?? "";
    const body = await c.req.text();

    logger.debug(
      { connectorId, webhookId },
      "Notion push notification received"
    );

    const rateAllowed = await rateLimiter.checkLimit(
      `notion:webhook:${connectorId}`,
      100,
      60
    );
    if (!rateAllowed) {
      logger.warn({ connectorId }, "Notion webhook rate limit exceeded");
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    const payload = parseNotionWebhookPayload(body);
    if (!payload) {
      logger.warn({ connectorId }, "Invalid Notion webhook payload format");
      return c.json({ error: "Invalid payload format" }, 400);
    }

    const watchState = await getNotionWatchState(connectorId);
    if (!watchState) {
      logger.warn({ connectorId }, "Watch state not found for connector");
      return c.json({ error: "Unknown connector" }, 404);
    }

    if (
      !verifyNotionWebhookSignature(body, signature, watchState.webhookSecret)
    ) {
      logger.warn(
        { connectorId },
        "Notion webhook signature verification failed"
      );
      return c.json({ error: "Invalid signature" }, 403);
    }

    const notification: NotionNotification = {
      payload,
      webhookId,
      signature,
      timestamp: Date.now(),
    };

    if (isExpiredNotionNotification(notification)) {
      logger.warn({ connectorId }, "Received expired Notion notification");
      return c.json({ ok: true, expired: true });
    }

    const result = await handleNotionNotification(
      notification,
      webhookConnectorCache
    );

    if (!result.processed) {
      logger.warn(
        { connectorId, error: result.error },
        "Notion notification not processed"
      );
      return c.json({ ok: true });
    }

    if (result.shouldSync) {
      const syncHandle = await startConnectorSync({
        connectorId,
        connectorType: "notion",
        syncType: "INCREMENTAL",
        trigger: "WEBHOOK",
        requestId: `webhook-${connectorId}-${Date.now()}`,
      });

      logger.info(
        {
          connectorId,
          eventType: payload.type,
          workflowId: syncHandle.workflowId,
          affectedPageIds: result.affectedPageIds?.length,
          affectedDatabaseIds: result.affectedDatabaseIds?.length,
        },
        "Notion sync triggered from push notification"
      );
    }

    return c.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "Notion push notification failed");
    return c.json({ error: "Internal server error" }, 500);
  }
});

notionWebhook.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export { notionWebhook };
