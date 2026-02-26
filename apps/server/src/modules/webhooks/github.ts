import prisma, { getConnectorById } from "@openplane/db";
import { getRedisClient, rateLimiter } from "@openplane/redis";
import {
  parseGitHubWebhookPayload,
  resolveGitHubWebhookChanges,
  verifyGitHubWebhookSignature,
} from "@openplane/services";
import { startConnectorSync } from "@openplane/temporal";
import type { GitHubConnectorConfig } from "@openplane/types/services/connectors/github";
import { Hono } from "hono";
import logger from "../../utils/logger";

const githubWebhook = new Hono();
const WEBHOOK_DEDUPE_TTL = 86_400;

const SYNC_TRIGGERING_EVENTS = new Set([
  "issues",
  "pull_request",
  "discussion",
  "push",
  "repository",
  "member",
  "team",
]);

githubWebhook.post("/events/:connectorId", async (c) => {
  const connectorId = c.req.param("connectorId");
  const signature = c.req.header("X-Hub-Signature-256") ?? "";
  const delivery = c.req.header("X-GitHub-Delivery") ?? "";
  const eventType = c.req.header("X-GitHub-Event") ?? "";
  const body = await c.req.text();

  logger.debug({ connectorId, delivery, eventType }, "GitHub webhook received");

  const rateAllowed = await rateLimiter.checkLimit(
    `github:webhook:${connectorId}`,
    100,
    60
  );
  if (!rateAllowed) {
    logger.warn({ connectorId }, "GitHub webhook rate limit exceeded");
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const connector = await getConnectorById(prisma, connectorId);
  if (!connector || connector.app !== "GITHUB") {
    logger.warn({ connectorId }, "GitHub connector not found");
    return c.json({ error: "Connector not found" }, 404);
  }

  const config = connector.config as GitHubConnectorConfig | null;

  if (!config?.webhook_secret) {
    logger.warn({ connectorId }, "GitHub webhook secret not configured");
    return c.json({ error: "Webhook not configured" }, 400);
  }

  const verification = verifyGitHubWebhookSignature(
    {
      headers: { "x-hub-signature-256": signature },
      body,
    },
    config.webhook_secret
  );

  if (!verification.valid) {
    logger.warn(
      { connectorId, error: verification.error },
      "GitHub webhook signature verification failed"
    );
    return c.json({ error: "Invalid signature" }, 403);
  }

  if (eventType === "ping") {
    logger.info({ connectorId }, "GitHub webhook ping acknowledged");
    return c.json({ ok: true });
  }

  let payload: ReturnType<typeof parseGitHubWebhookPayload>;
  try {
    payload = parseGitHubWebhookPayload(body);
  } catch {
    logger.warn({ connectorId }, "Invalid GitHub webhook payload");
    return c.json({ error: "Invalid payload" }, 400);
  }

  const eventId = delivery || `github-${connectorId}-${crypto.randomUUID()}`;

  const redis = await getRedisClient();
  const dedupeKey = `github:webhook:dedupe:${eventId}`;
  const alreadyProcessed = await redis.get(dedupeKey);
  if (alreadyProcessed) {
    logger.debug({ connectorId, eventId }, "Duplicate webhook ignored");
    return c.json({ ok: true });
  }
  await redis.set(dedupeKey, "1", { EX: WEBHOOK_DEDUPE_TTL });

  const { changes } = resolveGitHubWebhookChanges(eventType, payload);

  if (changes.length > 0 && SYNC_TRIGGERING_EVENTS.has(eventType)) {
    try {
      const syncHandle = await startConnectorSync({
        connectorId,
        connectorType: "GITHUB",
        syncType: "INCREMENTAL",
        trigger: "WEBHOOK",
        requestId: `webhook-${eventId}`,
        teamId: connector.teamId,
      });

      logger.info(
        {
          connectorId,
          eventId,
          eventType,
          action: payload.action,
          workflowId: syncHandle.workflowId,
          changeCount: changes.length,
        },
        "GitHub incremental sync triggered from webhook"
      );
    } catch (error) {
      logger.error(
        { connectorId, eventId, error },
        "Failed to trigger GitHub sync from webhook"
      );
    }
  } else {
    logger.info(
      { connectorId, eventId, eventType, action: payload.action },
      "GitHub webhook processed (no sync needed)"
    );
  }

  return c.json({ ok: true });
});

githubWebhook.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export { githubWebhook };
