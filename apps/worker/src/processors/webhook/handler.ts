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
import { processSlackWebhook, shouldProcessRealtime } from "./slack-handler";

export interface WebhookJobResult {
  triggered: boolean;
  processed?: boolean;
  operation?: string;
  reason?: string;
}

interface SyncFallbackParams {
  connectorId: string;
  eventId: string;
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  userId: string;
}

async function tryRealtimeProcessing(
  source: string,
  eventType: string,
  jobData: WebhookJobData
): Promise<WebhookJobResult | null> {
  if (source !== "slack" || !shouldProcessRealtime(eventType)) {
    return null;
  }

  const slackResult = await processSlackWebhook(jobData);
  if (!slackResult.processed) {
    return null;
  }

  return {
    triggered: true,
    processed: true,
    operation: slackResult.operation,
    reason: slackResult.reason,
  };
}

async function triggerSyncFallback(
  params: SyncFallbackParams
): Promise<WebhookJobResult> {
  const { connectorId, eventId, eventType, source, payload, userId } = params;

  const syncJob = await addSyncJob(
    {
      connectorId,
      syncJobId: `webhook-${eventId}`,
      type: "INCREMENTAL",
      priority: 10,
    },
    10
  );

  logger.info(
    { connectorId, eventId, syncJobId: syncJob.id, eventType, source },
    "Webhook triggered sync job"
  );

  await prisma.connectorAuditLog.create({
    data: {
      connectorId,
      userId,
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

  return { triggered: true };
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

    const { isDuplicate } = await eventDeduplicator.checkAndMark(
      eventId,
      source
    );
    if (isDuplicate) {
      span.setAttributes({ "webhook.duplicate": true });
      span.setStatus({ code: SpanStatusCode.OK });
      return { triggered: false, reason: "duplicate" };
    }

    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
      select: { id: true, status: true, type: true, userId: true },
    });

    if (!connector) {
      span.setAttributes({ "webhook.reason": "connector_not_found" });
      span.setStatus({ code: SpanStatusCode.OK });
      return { triggered: false, reason: "connector_not_found" };
    }

    if (connector.status !== "ACTIVE") {
      span.setAttributes({ "webhook.reason": "connector_inactive" });
      span.setStatus({ code: SpanStatusCode.OK });
      return { triggered: false, reason: "connector_inactive" };
    }

    const realtimeResult = await tryRealtimeProcessing(
      source,
      eventType,
      job.data
    );
    if (realtimeResult) {
      span.setAttributes({
        "webhook.processed": true,
        "webhook.operation": realtimeResult.operation ?? "none",
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return realtimeResult;
    }

    const result = await triggerSyncFallback({
      connectorId,
      eventId,
      eventType,
      source,
      payload,
      userId: connector.userId,
    });

    span.setAttributes({ "webhook.triggered": true });
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
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
