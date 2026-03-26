import { createHash } from "node:crypto";
import prisma, {
  createWebhookEvent,
  getCustomConnectorBySlugGlobal,
  incrementWebhookStats,
  markWebhookEventCompleted,
  markWebhookEventFailed,
} from "@openbeam/db";
import { eventDeduplicator, rateLimiter } from "@openbeam/redis";
import {
  extractEventId,
  getDedupTtl,
  routeEvent,
  transformWebhookPayload,
  verifyCustomWebhookSignature,
} from "@openbeam/services";
import {
  type WebhookConfig,
  WebhookConfigSchema,
} from "@openbeam/types/services/connectors/custom-webhook";
import type { GenericDocument } from "@openbeam/vespa";
import { deleteDocumentById, feedSingleDocument } from "@openbeam/vespa";
import { Hono } from "hono";
import logger from "../../utils/logger";

const customWebhook = new Hono();

const SLUG_RATE_LIMIT = 200;
const IP_RATE_LIMIT = 100;
const RATE_WINDOW_SECONDS = 60;

function normalizeHeaders(raw: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  raw.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

customWebhook.post("/:slug", async (c) => {
  const startTime = performance.now();
  const slug = c.req.param("slug");
  const clientIp = c.req.header("x-forwarded-for") ?? "unknown";

  const slugAllowed = await rateLimiter.checkLimit(
    `custom:webhook:slug:${slug}`,
    SLUG_RATE_LIMIT,
    RATE_WINDOW_SECONDS
  );
  if (!slugAllowed) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const ipAllowed = await rateLimiter.checkLimit(
    `custom:webhook:ip:${clientIp}`,
    IP_RATE_LIMIT,
    RATE_WINDOW_SECONDS
  );
  if (!ipAllowed) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  const definition = await getCustomConnectorBySlugGlobal(prisma, slug);
  if (!definition) {
    return c.json({ error: "Not found" }, 404);
  }

  if (!definition.webhookEnabled) {
    return c.json({ error: "Webhooks not enabled for this connector" }, 403);
  }

  let webhookConfig: WebhookConfig;
  const parseResult = WebhookConfigSchema.safeParse(definition.webhookConfig);
  if (!parseResult.success) {
    logger.error(
      { slug, errors: parseResult.error.issues },
      "Invalid webhook configuration"
    );
    return c.json({ error: "Invalid webhook configuration" }, 500);
  }
  webhookConfig = parseResult.data;

  const rawBody = await c.req.text();

  if (rawBody.length > webhookConfig.maxPayloadBytes) {
    return c.json(
      {
        error: `Payload exceeds maximum size of ${webhookConfig.maxPayloadBytes} bytes`,
      },
      413
    );
  }

  const headers = normalizeHeaders(c.req.raw.headers);

  if (webhookConfig.signature && definition.webhookSigningSecret) {
    const verification = verifyCustomWebhookSignature(
      rawBody,
      headers,
      webhookConfig.signature,
      definition.webhookSigningSecret
    );
    if (!verification.valid) {
      logger.warn(
        { slug, error: verification.error },
        "Webhook signature verification failed"
      );
      return c.json({ error: "Invalid signature" }, 403);
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const eventId = extractEventId(
    rawBody,
    headers,
    payload,
    webhookConfig.dedup
  );
  const dedupTtl = getDedupTtl(webhookConfig.dedup);
  const dedupSource = `custom:${definition.id}`;
  const { isDuplicate } = await eventDeduplicator.checkAndMark(
    eventId,
    dedupSource,
    dedupTtl
  );

  if (isDuplicate) {
    return c.json({ ok: true, eventId, deduplicated: true });
  }

  const route = routeEvent(headers, payload, webhookConfig);
  if (!route.shouldProcess) {
    return c.json({
      ok: true,
      eventId,
      action: "ignored",
      reason: route.reason,
    });
  }

  const payloadHash = createHash("sha256")
    .update(rawBody)
    .digest("hex")
    .slice(0, 32);

  const webhookEvent = await createWebhookEvent(prisma, {
    definitionId: definition.id,
    eventId,
    eventType: route.eventType,
    action: "processing",
    status: "processing",
    rawPayloadHash: payloadHash,
    payloadSize: rawBody.length,
  });

  const connectorId = definition.connectorId;
  const teamId = definition.teamId;
  const workspaceId = definition.connector.workspaceExternalId;

  const result = transformWebhookPayload(payload, headers, webhookConfig, {
    connectorId,
    teamId,
    workspaceId,
    slug,
  });

  if (!result.success) {
    await markWebhookEventFailed(
      prisma,
      webhookEvent.id,
      result.error ?? "Transform failed"
    );
    await incrementWebhookStats(prisma, definition.id, false);
    logger.error(
      { slug, eventId, error: result.error },
      "Webhook transform failed"
    );
    return c.json({ ok: false, eventId, error: result.error }, 422);
  }

  if (result.action === "ignore") {
    const processingMs = Math.round(performance.now() - startTime);
    await markWebhookEventCompleted(prisma, webhookEvent.id, [], processingMs);
    await incrementWebhookStats(prisma, definition.id, true);
    return c.json({ ok: true, eventId, action: "ignored" });
  }

  if (result.action === "delete" && result.documentId) {
    const deleteResult = await deleteDocumentById(result.documentId);
    const processingMs = Math.round(performance.now() - startTime);

    if (deleteResult.success) {
      await markWebhookEventCompleted(
        prisma,
        webhookEvent.id,
        [result.documentId],
        processingMs
      );
      await incrementWebhookStats(prisma, definition.id, true);
      return c.json({
        ok: true,
        eventId,
        action: "delete",
        documentId: result.documentId,
      });
    }

    await markWebhookEventFailed(
      prisma,
      webhookEvent.id,
      deleteResult.error ?? "Delete failed"
    );
    await incrementWebhookStats(prisma, definition.id, false);
    return c.json({ ok: false, eventId, error: deleteResult.error }, 500);
  }

  if (result.action === "upsert" && result.document) {
    const feedResult = await feedSingleDocument(
      result.document as unknown as GenericDocument,
      { skipValidation: false }
    );
    const processingMs = Math.round(performance.now() - startTime);

    if (feedResult.success) {
      await markWebhookEventCompleted(
        prisma,
        webhookEvent.id,
        [result.documentId ?? ""],
        processingMs
      );
      await incrementWebhookStats(prisma, definition.id, true);
      logger.info(
        { slug, eventId, documentId: result.documentId },
        "Webhook document indexed"
      );
      return c.json(
        {
          ok: true,
          eventId,
          action: "upsert",
          documentId: result.documentId,
        },
        202
      );
    }

    await markWebhookEventFailed(
      prisma,
      webhookEvent.id,
      feedResult.error ?? "Feed failed"
    );
    await incrementWebhookStats(prisma, definition.id, false);
    logger.error(
      { slug, eventId, error: feedResult.error },
      "Webhook feed failed"
    );
    return c.json({ ok: false, eventId, error: feedResult.error }, 500);
  }

  return c.json({ ok: true, eventId, action: result.action });
});

customWebhook.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export { customWebhook };
