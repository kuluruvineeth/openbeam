import type { DigestSubscriptionWithConnector } from "@openplane/db";
import prisma, { listAllEnabledDigestSubscriptions } from "@openplane/db";
import {
  createRepeatableDigestJob,
  deleteDigestSchedulerKey,
  getDigestSchedulerKey,
  removeRepeatableDigestJob,
  setDigestSchedulerKey,
  toUtcCron,
} from "@openplane/redis";
import logger from "../utils/logger";

export class DigestScheduler {
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Digest scheduler already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting digest scheduler");

    await this.initializeRepeatableJobs();

    logger.info("Digest scheduler started successfully");
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }
    this.isRunning = false;
    logger.info("Digest scheduler stopped");
  }

  private async initializeRepeatableJobs(): Promise<void> {
    try {
      const subscriptions = await listAllEnabledDigestSubscriptions(prisma);

      logger.info(
        { count: subscriptions.length },
        "Initializing digest repeatable jobs"
      );

      await Promise.allSettled(
        subscriptions.map((sub) => this.ensureRepeatableJob(sub))
      );

      logger.info("Digest repeatable jobs initialization complete");
    } catch (error) {
      logger.error({ error }, "Failed to initialize digest repeatable jobs");
    }
  }

  private async ensureRepeatableJob(
    sub: DigestSubscriptionWithConnector
  ): Promise<void> {
    try {
      const existingKey = await getDigestSchedulerKey(sub.id);
      if (existingKey) {
        await removeRepeatableDigestJob(existingKey);
      }

      const cron = toUtcCron(
        sub.deliveryTime,
        sub.timezone,
        sub.frequency as "daily" | "weekly"
      );

      const schedulerId = await createRepeatableDigestJob(sub.id, cron, {
        subscriptionId: sub.id,
        connectorId: sub.connectorId,
        userId: sub.userId,
        slackUserId: sub.slackUserId,
        teamId: sub.connector.teamId,
        channelIds: sub.channelIds,
        topics: sub.topics,
        deliveryTime: sub.deliveryTime,
        timezone: sub.timezone,
        frequency: sub.frequency as "daily" | "weekly",
      });

      await setDigestSchedulerKey(sub.id, schedulerId);

      logger.debug(
        {
          subscriptionId: sub.id,
          cron,
          schedulerId,
        },
        "Created digest repeatable job"
      );
    } catch (error) {
      logger.error(
        { error, subscriptionId: sub.id },
        "Failed to create digest repeatable job"
      );
    }
  }

  async registerRepeatableJob(
    sub: DigestSubscriptionWithConnector
  ): Promise<void> {
    await this.ensureRepeatableJob(sub);
  }

  async unregisterRepeatableJob(subscriptionId: string): Promise<void> {
    try {
      const existingKey = await getDigestSchedulerKey(subscriptionId);
      if (existingKey) {
        await removeRepeatableDigestJob(existingKey);
        await deleteDigestSchedulerKey(subscriptionId);
        logger.info({ subscriptionId }, "Unregistered digest repeatable job");
      }
    } catch (error) {
      logger.error(
        { error, subscriptionId },
        "Failed to unregister digest repeatable job"
      );
    }
  }

  getStatus(): { running: boolean } {
    return { running: this.isRunning };
  }
}
