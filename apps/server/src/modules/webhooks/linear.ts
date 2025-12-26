import prisma, { getConnectorById } from "@openplane/db";
import { addWebhookJob, getRedisClient, rateLimiter } from "@openplane/redis";
import {
  isLinearTimestampValid,
  parseLinearWebhookPayload,
  verifyLinearWebhookSignature,
} from "@openplane/services";
import { Hono } from "hono";
import logger from "../../utils/logger";

const linearWebhook = new Hono();
const WEBHOOK_DEDUPE_TTL = 86_400;

interface LinearConnectorConfig {
  organizationId?: string;
  webhook_secret?: string;
}

linearWebhook.post("/events/:connectorId", async (c) => {
  const connectorId = c.req.param("connectorId");
  const signature = c.req.header("Linear-Signature") ?? "";
  const delivery = c.req.header("Linear-Delivery") ?? "";
  const body = await c.req.text();

  logger.debug({ connectorId, delivery }, "Linear webhook received");

  const rateAllowed = await rateLimiter.checkLimit(
    `linear:webhook:${connectorId}`,
    100,
    60
  );
  if (!rateAllowed) {
    logger.warn({ connectorId }, "Linear webhook rate limit exceeded");
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const connector = await getConnectorById(prisma, connectorId);
  if (!connector || connector.app !== "LINEAR") {
    logger.warn({ connectorId }, "Linear connector not found");
    return c.json({ error: "Connector not found" }, 404);
  }

  const config = connector.config as LinearConnectorConfig | null;

  if (!config?.webhook_secret) {
    logger.warn({ connectorId }, "Linear webhook secret not configured");
    return c.json({ error: "Webhook not configured" }, 400);
  }

  const verification = verifyLinearWebhookSignature(
    { headers: { "linear-signature": signature }, body },
    config.webhook_secret
  );

  if (!verification.valid) {
    logger.warn(
      { connectorId, error: verification.error },
      "Linear webhook signature verification failed"
    );
    return c.json({ error: "Invalid signature" }, 403);
  }

  let payload: { type?: string; webhookTimestamp?: number };
  try {
    payload = parseLinearWebhookPayload(body) as typeof payload;
  } catch {
    logger.warn({ connectorId }, "Invalid Linear webhook payload");
    return c.json({ error: "Invalid payload" }, 400);
  }

  if (
    payload.webhookTimestamp &&
    !isLinearTimestampValid(payload.webhookTimestamp)
  ) {
    logger.warn({ connectorId }, "Linear webhook timestamp too old");
    return c.json({ error: "Webhook too old" }, 400);
  }

  const eventId = delivery || `linear-${connectorId}-${Date.now()}`;

  const redis = await getRedisClient();
  const dedupeKey = `linear:webhook:dedupe:${eventId}`;
  const alreadyProcessed = await redis.get(dedupeKey);
  if (alreadyProcessed) {
    logger.debug({ connectorId, eventId }, "Duplicate webhook ignored");
    return c.json({ ok: true });
  }
  await redis.set(dedupeKey, "1", { EX: WEBHOOK_DEDUPE_TTL });

  await addWebhookJob({
    connectorId,
    eventId,
    eventType: payload.type ?? "unknown",
    source: "linear",
    payload: payload as Record<string, unknown>,
    receivedAt: new Date(),
  });

  logger.info(
    { connectorId, eventId, eventType: payload.type },
    "Linear webhook queued"
  );

  return c.json({ ok: true });
});

linearWebhook.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export { linearWebhook };
