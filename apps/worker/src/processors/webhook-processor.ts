import prisma, { type Prisma } from "@openplane/db";
import {
  addSyncJob,
  addWebhookJob,
  eventDeduplicator,
  type WebhookJobData,
} from "@openplane/redis";
import type { Job } from "bullmq";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

/**
 * Webhook Processor
 *
 * Processes incoming webhooks and triggers immediate syncs.
 * Enables real-time document updates.
 */
export class WebhookProcessor extends BaseProcessor<WebhookJobData> {
  constructor() {
    super("webhook", {
      concurrency: 20, // High concurrency for real-time processing
      limiter: {
        max: 100,
        duration: 1000, // Max 100 webhooks per second
      },
    });
  }

  protected async processJob(
    job: Job<WebhookJobData>
  ): Promise<{ triggered: boolean; reason?: string }> {
    const { connectorId, eventId, eventType, source, payload } = job.data;

    logger.info(
      { jobId: job.id, connectorId, eventId, eventType, source },
      "Processing webhook"
    );

    try {
      // 1. Check for duplicate events
      const { isDuplicate, marked } = await eventDeduplicator.checkAndMark(
        eventId,
        source
      );

      if (isDuplicate) {
        logger.info(
          { connectorId, eventId, source },
          "Duplicate webhook event, skipping"
        );
        return { triggered: false, reason: "duplicate" };
      }

      logger.info(
        { connectorId, eventId, source, marked },
        "Webhook event marked as processed"
      );

      // 2. Verify connector exists and is active
      const connector = await prisma.connector.findUnique({
        where: { id: connectorId },
        select: { id: true, status: true, type: true, userId: true },
      });

      if (!connector) {
        logger.warn({ connectorId, eventId }, "Connector not found");
        return { triggered: false, reason: "connector_not_found" };
      }

      if (connector.status !== "ACTIVE") {
        logger.warn(
          { connectorId, eventId, status: connector.status },
          "Connector not active"
        );
        return { triggered: false, reason: "connector_inactive" };
      }

      // 3. Trigger immediate incremental sync with high priority
      const syncJob = await addSyncJob(
        {
          connectorId,
          syncJobId: `webhook-${eventId}`,
          type: "INCREMENTAL",
          priority: 10, // Highest priority
        },
        10
      );

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

      // 4. Store webhook event for audit/replay (keep for 7 days)
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

      return { triggered: true };
    } catch (error) {
      logger.error(
        { error, jobId: job.id, connectorId, eventId },
        "Webhook processing failed"
      );
      throw error;
    }
  }

  /**
   * Replay a webhook event by event ID
   */
  async replayWebhookEvent(
    connectorId: string,
    eventId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the webhook event in audit log
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

      // Unmark the event in deduplication to allow replay
      await eventDeduplicator.unmark(eventId, metadata.source);

      // Re-enqueue the webhook
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

  /**
   * Replay webhooks within a time range
   */
  async replayWebhooksInRange(
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
          createdAt: {
            gte: startTime,
            lte: endTime,
          },
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
        const replayResult = await this.replayWebhookEvent(
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
}
