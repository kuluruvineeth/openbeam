import { rateLimiter } from "@openbeam/redis";
import {
  getDriveWatchStateForConnector,
  handleGoogleDriveNotification,
  isExpiredDriveNotification,
  parseGoogleDriveNotification,
  validateDriveNotificationSignature,
} from "@openbeam/services";
import { startConnectorSync } from "@openbeam/temporal";
import { Hono } from "hono";
import logger from "../../utils/logger";

const googleDriveWebhook = new Hono();

const channelConnectorCache = new Map<string, string>();

googleDriveWebhook.post("/push", async (c) => {
  try {
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    logger.debug({ headers }, "Google Drive push notification received");

    const notification = parseGoogleDriveNotification(headers);
    if (!notification) {
      logger.warn({ headers }, "Invalid Google Drive push notification format");
      return c.json({ error: "Invalid notification format" }, 400);
    }

    const rateAllowed = await rateLimiter.checkLimit(
      `gdrive:webhook:${notification.channelId}`,
      100,
      60
    );
    if (!rateAllowed) {
      logger.warn(
        { channelId: notification.channelId },
        "Google Drive webhook rate limit exceeded"
      );
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    if (isExpiredDriveNotification(notification)) {
      logger.warn(
        { channelId: notification.channelId },
        "Received expired Google Drive notification"
      );
      return c.json({ ok: true, expired: true });
    }

    const result = await handleGoogleDriveNotification(
      notification,
      channelConnectorCache
    );

    if (!result.processed) {
      logger.warn(
        { channelId: notification.channelId, error: result.error },
        "Google Drive notification not processed"
      );
      return c.json({ ok: true });
    }

    if (!result.connectorId) {
      return c.json({ ok: true });
    }

    const watchState = await getDriveWatchStateForConnector(result.connectorId);
    const expectedToken = (watchState as { token?: string } | null)?.token;
    if (
      expectedToken &&
      !validateDriveNotificationSignature(headers, expectedToken)
    ) {
      logger.warn(
        { channelId: notification.channelId, connectorId: result.connectorId },
        "Google Drive notification signature validation failed"
      );
      return c.json({ error: "Invalid signature" }, 403);
    }

    if (result.shouldSync) {
      const syncHandle = await startConnectorSync({
        connectorId: result.connectorId,
        connectorType: "google-drive",
        syncType: "INCREMENTAL",
        trigger: "WEBHOOK",
        requestId: `webhook-${notification.channelId}-${notification.messageNumber}`,
      });

      logger.info(
        {
          connectorId: result.connectorId,
          channelId: notification.channelId,
          resourceState: notification.resourceState,
          workflowId: syncHandle.workflowId,
        },
        "Google Drive sync triggered from push notification"
      );
    }

    return c.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "Google Drive push notification failed");
    return c.json({ error: "Internal server error" }, 500);
  }
});

googleDriveWebhook.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export { googleDriveWebhook };
