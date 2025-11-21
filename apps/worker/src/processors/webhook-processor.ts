/**
 * Webhook Processor
 * 
 * Processes incoming webhooks and triggers immediate syncs.
 * Enables real-time document updates.
 */

import prisma from "@openplane/db";
import {
  addSyncJob,
  eventDeduplicator,
  getRedisConnection,
  type WebhookJobData,
} from "@openplane/redis";
import { type Job, Worker } from "bullmq";
import logger from "../utils/logger";

export class WebhookProcessor {
  private worker: Worker | null = null;
  private readonly initialization: Promise<void>;

  constructor() {
    this.initialization = this.initialize();
  }

  private async initialize(): Promise<void> {
    const connection = await getRedisConnection();

    const worker = new Worker(
      "webhook",
      async (job: Job<WebhookJobData>) => this.processJob(job),
      {
        connection,
        concurrency: 20, // High concurrency for real-time processing
        limiter: {
          max: 100,
          duration: 1000, // Max 100 webhooks per second
        },
      }
    );

    this.setupEventHandlers(worker);
    this.worker = worker;
  }

  private async processJob(
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
        select: { id: true, status: true, type: true },
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

      // 4. Store webhook event for audit/replay
      await prisma.connectorAuditLog.create({
        data: {
          connectorId,
          action: "WEBHOOK_RECEIVED",
          metadata: {
            eventId,
            eventType,
            source,
            syncJobId: syncJob.id,
            payload,
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

  private setupEventHandlers(worker: Worker) {
    worker.on("completed", (job) => {
      logger.info({ jobId: job.id }, "Webhook job completed");
    });

    worker.on("failed", (job, error) => {
      logger.error(
        { jobId: job?.id, error: error.message },
        "Webhook job failed"
      );
    });

    worker.on("error", (error) => {
      logger.error({ error }, "Webhook worker error");
    });

    worker.on("stalled", (jobId) => {
      logger.warn({ jobId }, "Webhook job stalled");
    });
  }

  async close(): Promise<void> {
    await this.initialization;
    if (this.worker) {
      await this.worker.close();
      logger.info("Webhook processor closed");
    }
  }

  getWorker(): Worker {
    if (!this.worker) {
      throw new Error("Webhook worker not initialized");
    }
    return this.worker;
  }
}

