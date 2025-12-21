import {
  handleGmailNotification,
  parseWebhookRequest,
} from "@openplane/services";
import { Hono } from "hono";
import logger from "../../utils/logger";

const gmailWebhook = new Hono();

gmailWebhook.post("/push", async (c) => {
  try {
    const body = await c.req.json();

    logger.info({ body }, "Gmail push notification received");

    const notification = parseWebhookRequest(body);
    if (!notification) {
      logger.warn({ body }, "Invalid Gmail push notification format");
      return c.json({ error: "Invalid notification format" }, 400);
    }

    const result = await handleGmailNotification(notification, {
      syncPriority: 2,
    });

    if (result.handled) {
      logger.info(
        { messageId: notification.message.messageId },
        "Gmail notification processed successfully"
      );
    } else {
      logger.warn(
        { reason: result.reason, messageId: notification.message.messageId },
        "Gmail notification not handled"
      );
    }

    return c.json({ ok: true });
  } catch (error) {
    logger.error({ error }, "Gmail push notification failed");
    return c.json({ error: "Internal server error" }, 500);
  }
});

gmailWebhook.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export { gmailWebhook };
