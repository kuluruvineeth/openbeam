import prisma, {
  createWebhookReceivedLog,
  findAuditLogByEventId,
  findConnectorById,
  findWebhookAuditLogs,
  type Prisma,
} from "@openplane/db";
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
import {
  isAssistantThreadMessage,
  processSidebarMessage,
} from "./sidebar-handler";
import { processSlackWebhook, shouldProcessRealtime } from "./slack-handler";

const CRAWL_HINT_EVENTS: Record<string, string> = {
  file_shared: "files",
  file_deleted: "files",
  file_created: "files",
  file_change: "files",
  channel_created: "channels",
  channel_deleted: "channels",
  channel_rename: "channels",
  channel_archive: "channels",
  channel_unarchive: "channels",
  member_joined_channel: "permissions",
  member_left_channel: "permissions",
};

const crawlHintTimestamps = new Map<string, number>();
const CRAWL_HINT_DEBOUNCE_MS = 30_000;

async function queueCrawlHint(
  connectorId: string,
  eventType: string
): Promise<void> {
  const resourceType = CRAWL_HINT_EVENTS[eventType];
  if (!resourceType) {
    return;
  }

  const key = `${connectorId}:${resourceType}`;
  const now = Date.now();
  const lastQueued = crawlHintTimestamps.get(key);

  if (lastQueued && now - lastQueued < CRAWL_HINT_DEBOUNCE_MS) {
    return;
  }

  crawlHintTimestamps.set(key, now);

  const syncType =
    resourceType === "permissions" ? "PERMISSIONS" : "INCREMENTAL";
  const syncJob = await addSyncJob(
    {
      connectorId,
      syncJobId: "",
      type: syncType,
      priority: 8,
    },
    8
  );

  logger.info(
    { connectorId, resourceType, eventType, syncType, bullmqJobId: syncJob.id },
    "Queued crawl hint sync"
  );
}

const UI_ONLY_EVENTS = new Set([
  "app_home_opened",
  "assistant_thread_started",
  "assistant_thread_context_changed",
  "global_ask",
]);

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

  if (eventType === "message") {
    const payload = jobData.payload as {
      event?: {
        channel: string;
        channel_type?: string;
        thread_ts?: string;
        ts: string;
        bot_id?: string;
        subtype?: string;
        user?: string;
        text?: string;
      };
    };
    const event = payload.event;

    if (event) {
      const sidebarContext = await isAssistantThreadMessage({
        type: "message",
        channel: event.channel,
        channel_type: event.channel_type,
        thread_ts: event.thread_ts,
        ts: event.ts,
        bot_id: event.bot_id,
        subtype: event.subtype,
        user: event.user,
        text: event.text,
      });

      if (sidebarContext) {
        const sidebarResult = await processSidebarMessage(
          jobData,
          sidebarContext
        );
        return {
          triggered: true,
          processed: sidebarResult.processed,
          operation: sidebarResult.operation,
          reason: sidebarResult.reason,
        };
      }
    }
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
      syncJobId: "",
      type: "INCREMENTAL",
      priority: 10,
    },
    10
  );

  logger.info(
    { connectorId, eventId, bullmqJobId: syncJob.id, eventType, source },
    "Webhook triggered sync job"
  );

  await createWebhookReceivedLog(prisma, {
    connectorId,
    userId,
    eventId,
    eventType,
    source,
    syncJobId: syncJob.id,
    payload: payload as Prisma.InputJsonValue,
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

    const connector = await findConnectorById(prisma, connectorId);

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

      if (realtimeResult.processed) {
        await queueCrawlHint(connectorId, eventType);
      }

      return realtimeResult;
    }

    if (UI_ONLY_EVENTS.has(eventType)) {
      span.setAttributes({ "webhook.reason": "ui_only_event" });
      span.setStatus({ code: SpanStatusCode.OK });
      return { triggered: false, reason: "ui_only_event" };
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
    const auditLog = await findAuditLogByEventId(prisma, connectorId, eventId);

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
    const auditLogs = await findWebhookAuditLogs(prisma, connectorId, {
      startTime,
      endTime,
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
