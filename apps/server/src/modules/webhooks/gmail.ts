import {
  checkGmailWebhookRateLimit,
  handleGmailNotification,
  parsePubSubNotification,
  parseWebhookRequest,
  validateGmailWebhookToken,
} from "@openplane/services";
import { Hono } from "hono";
import logger from "../../utils/logger";

const gmailWebhook = new Hono();

gmailWebhook.post("/push", async (c) => {
  try {
    const body = await c.req.json();

    logger.debug({ body }, "Gmail push notification received");

    const notification = parseWebhookRequest(body);
    if (!notification) {
      logger.warn({ body }, "Invalid Gmail push notification format");
      return c.json({ error: "Invalid notification format" }, 400);
    }

    const parsed = parsePubSubNotification(notification);
    if (!parsed) {
      logger.warn({ body }, "Failed to parse Gmail notification data");
      return c.json({ error: "Invalid notification data" }, 400);
    }

    const token = c.req.header("x-goog-channel-token");
    const validation = await validateGmailWebhookToken(
      parsed.emailAddress,
      token
    );

    if (!validation.valid) {
      logger.warn(
        { reason: validation.reason, emailAddress: parsed.emailAddress },
        "Gmail webhook token validation failed"
      );
      return c.json({ error: "Forbidden" }, 403);
    }

    const { connectorId } = validation;
    if (!connectorId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const rateLimit = await checkGmailWebhookRateLimit(connectorId);
    if (!rateLimit.allowed) {
      logger.warn({ connectorId }, "Gmail webhook rate limit exceeded");
      return c.json({ error: "Rate limit exceeded" }, 429);
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
      logger.debug(
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
