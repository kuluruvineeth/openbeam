import prisma, { type Prisma } from "@openplane/db";
import {
  addSyncJob,
  addWebhookJob,
  createLinkedSpan,
  eventDeduplicator,
  type WebhookJobData,
} from "@openplane/redis";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobError, logJobStart } from "../event-handlers";

export interface WebhookJobResult {
  triggered: boolean;
  reason?: string;
}

export async function processWebhookJob(
  job: Job<WebhookJobData>
): Promise<WebhookJobResult> {
  const { connectorId, eventId, eventType, source, payload, traceContext } =
    job.data;

  const span = createLinkedSpan(
    "openplane-worker",
    "webhook-processor.process",
    traceContext,
    {
      "job.id": job.id || "",
      "connector.id": connectorId,
      "webhook.event_id": eventId,
      "webhook.event_type": eventType,
      "webhook.source": source,
    }
  );

  try {
    logJobStart("webhook", job.id, { connectorId, eventId, eventType, source });

    const { isDuplicate, marked } = await eventDeduplicator.checkAndMark(
      eventId,
      source
    );

    if (isDuplicate) {
      span.setAttributes({ "webhook.duplicate": true });
      span.setStatus({ code: SpanStatusCode.OK });
      logger.info(
        { connectorId, eventId, source },
        "Duplicate webhook event, skipping"
      );
      return { triggered: false, reason: "duplicate" };
    }

    span.setAttribute("webhook.duplicate", false);
    logger.info(
      { connectorId, eventId, source, marked },
      "Webhook event marked as processed"
    );

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
      select: { id: true, status: true, type: true, userId: true },
    });

    if (!connector) {
      span.setAttributes({
        "webhook.triggered": false,
        "webhook.reason": "connector_not_found",
      });
      span.setStatus({ code: SpanStatusCode.OK });
      logger.warn({ connectorId, eventId }, "Connector not found");
      return { triggered: false, reason: "connector_not_found" };
    }

    if (connector.status !== "ACTIVE") {
      span.setAttributes({
        "webhook.triggered": false,
        "webhook.reason": "connector_inactive",
        "connector.status": connector.status,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      logger.warn(
        { connectorId, eventId, status: connector.status },
        "Connector not active"
      );
      return { triggered: false, reason: "connector_inactive" };
    }

    const syncJob = await addSyncJob(
      {
        connectorId,
        syncJobId: `webhook-${eventId}`,
        type: "INCREMENTAL",
        priority: 10,
      },
      10
    );

    span.setAttributes({
      "webhook.triggered": true,
      "sync.job_id": syncJob.id,
    });

    logger.info(
      {
        connectorId,
        eventId,
        syncJobId: syncJob.id,
        eventType,
        source,
      },
      "Webhook triggered sync job"
    );

    await prisma.connectorAuditLog.create({
      data: {
        connectorId,
        userId: connector.userId,
        action: "WEBHOOK_RECEIVED",
        changes: {
          eventId,
          eventType,
          source,
          syncJobId: syncJob.id,
          payload: payload as Prisma.InputJsonValue,
          receivedAt: new Date().toISOString(),
        },
      },
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return { triggered: true };
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    span.setAttributes({
      "error.type": error instanceof Error ? error.constructor.name : "Unknown",
    });
    logJobError("webhook", job.id, error, { connectorId, eventId });
    throw error;
  } finally {
    span.end();
  }
}

export async function replayWebhookEvent(
  connectorId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auditLog = await prisma.connectorAuditLog.findFirst({
      where: {
        connectorId,
        action: "WEBHOOK_RECEIVED",
        changes: {
          path: ["eventId"],
          equals: eventId,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!auditLog) {
      return { success: false, error: "Webhook event not found" };
    }

    const metadata = auditLog.changes as {
      eventId: string;
      eventType: string;
      source: string;
      payload: Record<string, unknown>;
    };

    await eventDeduplicator.unmark(eventId, metadata.source);

    await addWebhookJob({
      connectorId,
      eventId: `replay-${eventId}`,
      eventType: metadata.eventType,
      source: metadata.source,
      payload: metadata.payload,
      receivedAt: new Date(),
    });

    logger.info(
      { connectorId, eventId },
      "Webhook event replayed successfully"
    );
    return { success: true };
  } catch (error) {
    logger.error({ error, connectorId, eventId }, "Webhook replay failed");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function replayWebhooksInRange(
  connectorId: string,
  startTime: Date,
  endTime: Date
): Promise<{ replayed: number; failed: number }> {
  const result = { replayed: 0, failed: 0 };

  try {
    const auditLogs = await prisma.connectorAuditLog.findMany({
      where: {
        connectorId,
        action: "WEBHOOK_RECEIVED",
        createdAt: { gte: startTime, lte: endTime },
      },
      orderBy: { createdAt: "asc" },
    });

    logger.info(
      { connectorId, count: auditLogs.length, startTime, endTime },
      "Replaying webhooks in range"
    );

    for (const log of auditLogs) {
      const metadata = log.changes as {
        eventId: string;
        eventType: string;
        source: string;
        payload: Record<string, unknown>;
      };
      const replayResult = await replayWebhookEvent(
        connectorId,
        metadata.eventId
      );

      if (replayResult.success) {
        result.replayed += 1;
      } else {
        result.failed += 1;
      }
    }

    return result;
  } catch (error) {
    logger.error(
      { error, connectorId, startTime, endTime },
      "Webhook range replay failed"
    );
    throw error;
  }
}
