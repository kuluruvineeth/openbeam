import db, { findConnectorById } from "@openbeam/db";
import { rateLimiter } from "@openbeam/redis";
import {
  isDuplicateEvent,
  publishWebhookEvent,
} from "@openbeam/redis/streams/webhook-stream";
import { startConnectorSync } from "@openbeam/temporal";
import { Hono } from "hono";

const RATE_LIMIT = 100;
const RATE_WINDOW = 60;

export const webhookGateway = new Hono();

webhookGateway.post("/:connectorType/:connectorId/events", async (c) => {
  const { connectorType, connectorId } = c.req.param();

  const allowed = await rateLimiter.checkLimit(
    `webhook:gateway:${connectorId}`,
    RATE_LIMIT,
    RATE_WINDOW
  );

  if (!allowed) {
    return c.json({ accepted: false, rateLimited: true }, 429);
  }

  const body = await c.req.text();
  const eventId =
    c.req.header("x-event-id") ??
    c.req.header("x-github-delivery") ??
    c.req.header("x-request-id") ??
    crypto.randomUUID();

  const duplicate = await isDuplicateEvent(connectorType, eventId);
  if (duplicate) {
    return c.json({ accepted: true, eventId, deduplicated: true });
  }

  const connector = await findConnectorById(db, connectorId);

  if (!connector) {
    return c.json({ accepted: false, error: "Connector not found" }, 404);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    payload = { raw: body };
  }

  await publishWebhookEvent({
    id: eventId,
    connectorType,
    connectorId,
    teamId: connector.teamId,
    eventType:
      c.req.header("x-github-event") ?? (payload.type as string) ?? "unknown",
    payload: JSON.stringify(payload),
    receivedAt: String(Date.now()),
  });

  await startConnectorSync({
    connectorId,
    connectorType: connector.app,
    syncType: "INCREMENTAL",
    trigger: "WEBHOOK",
    requestId: `webhook-${eventId}`,
    teamId: connector.teamId,
  });

  return c.json({ accepted: true, eventId, deduplicated: false });
});
