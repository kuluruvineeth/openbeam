/**
 * Notification Processor
 *
 * Processes user notifications across multiple channels (in-app, email, push, slack).
 * Supports batching, deduplication, and user preferences.
 *
 * Uses @openplane/db queries and mutations for clean separation.
 */
import prisma, {
  getTeamSlackWebhook,
  getUserEmail,
  getUserNotificationSettings,
  getUserPushTokens,
  type UserNotificationSettings,
} from "@openplane/db";
import {
  createLinkedSpan,
  type NotificationJobData,
  type NotificationJobResult,
} from "@openplane/redis";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { workerConfig } from "../config";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

// === Types ===

interface ChannelContext {
  email?: string;
  pushTokens?: string[];
  slackWebhook?: string;
}

interface SendResult {
  success: boolean;
  error?: string;
}

// === Channel Sender Functions ===

function sendInApp(notification: NotificationJobData): SendResult {
  logger.info(
    {
      notificationId: notification.notificationId,
      userId: notification.userId,
    },
    "Creating in-app notification"
  );
  // TODO: Store notification in database
  return { success: true };
}

function sendEmail(
  notification: NotificationJobData,
  preferences: UserNotificationSettings,
  context: ChannelContext
): SendResult {
  if (!preferences.emailEnabled) {
    return { success: false, error: "Email notifications disabled" };
  }
  if (!context.email) {
    return { success: false, error: "No email address available" };
  }
  logger.info(
    {
      notificationId: notification.notificationId,
      userId: notification.userId,
      email: context.email,
    },
    "Sending email notification"
  );
  // TODO: Implement email sending via provider
  return { success: true };
}

function sendPush(
  notification: NotificationJobData,
  preferences: UserNotificationSettings,
  context: ChannelContext
): SendResult {
  if (!preferences.pushEnabled) {
    return { success: false, error: "Push notifications disabled" };
  }
  if (!context.pushTokens || context.pushTokens.length === 0) {
    return { success: false, error: "No push tokens available" };
  }
  logger.info(
    {
      notificationId: notification.notificationId,
      userId: notification.userId,
      tokenCount: context.pushTokens.length,
    },
    "Sending push notification"
  );
  // TODO: Implement push notification via FCM/APNS
  return { success: true };
}

function sendSlack(
  notification: NotificationJobData,
  preferences: UserNotificationSettings,
  context: ChannelContext
): SendResult {
  if (!preferences.slackEnabled) {
    return { success: false, error: "Slack notifications disabled" };
  }
  if (!context.slackWebhook) {
    return { success: false, error: "Slack webhook not configured" };
  }
  logger.info(
    {
      notificationId: notification.notificationId,
      userId: notification.userId,
    },
    "Sending Slack notification"
  );
  // TODO: Send to Slack webhook
  return { success: true };
}

function sendTeams(notification: NotificationJobData): SendResult {
  logger.info(
    {
      notificationId: notification.notificationId,
      userId: notification.userId,
    },
    "Sending Teams notification"
  );
  // TODO: Implement Microsoft Teams notification
  return { success: true };
}

// === Channel Dispatcher ===

function dispatchToChannel(
  channel: string,
  notification: NotificationJobData,
  preferences: UserNotificationSettings,
  context: ChannelContext
): SendResult | null {
  switch (channel) {
    case "in_app":
      return sendInApp(notification);
    case "email":
      return sendEmail(notification, preferences, context);
    case "push":
      return sendPush(notification, preferences, context);
    case "slack":
      return sendSlack(notification, preferences, context);
    case "teams":
      return sendTeams(notification);
    default:
      return null;
  }
}

// === Notification Processor ===

export class NotificationProcessor extends BaseProcessor<NotificationJobData> {
  constructor() {
    super("notification", {
      concurrency: workerConfig.notification.concurrency,
      limiter: workerConfig.notification.rateLimit,
    });
  }

  protected async processJob(
    job: Job<NotificationJobData>
  ): Promise<NotificationJobResult> {
    const notification = job.data;

    const span = createLinkedSpan(
      "openplane-worker",
      "notification-processor.process",
      notification.traceContext,
      {
        "job.id": job.id || "",
        "notification.id": notification.notificationId,
        "notification.type": notification.type,
      }
    );

    try {
      logger.info(
        {
          jobId: job.id,
          notificationId: notification.notificationId,
          type: notification.type,
          channels: notification.channels,
        },
        "Processing notification job"
      );

      // Check expiration
      const expiredResult = this.checkExpiration(notification);
      if (expiredResult) return expiredResult;

      // Get user preferences
      const preferences = await getUserNotificationSettings(
        prisma,
        notification.userId
      );

      // Check deduplication
      const duplicateResult =
        await this.checkAndHandleDuplication(notification);
      if (duplicateResult) return duplicateResult;

      // Get channel context
      const context = await this.getChannelContext(notification);

      // Process channels
      const result = await this.processChannels(
        notification,
        preferences,
        context
      );

      // Mark as delivered for deduplication
      await this.markDelivered(notification);

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        "notification.delivered": result.delivered.length,
        "notification.failed": result.failed.length,
        "notification.skipped": result.skipped.length,
      });

      logger.info(
        {
          notificationId: notification.notificationId,
          delivered: result.delivered.length,
          failed: result.failed.length,
          skipped: result.skipped.length,
        },
        "Notification job completed"
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error(
        {
          error: errorMessage,
          jobId: job.id,
          notificationId: notification.notificationId,
        },
        "Notification job failed"
      );

      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Check if notification has expired
   */
  private checkExpiration(
    notification: NotificationJobData
  ): NotificationJobResult | null {
    if (notification.expiresAt && notification.expiresAt < Date.now()) {
      logger.info(
        { notificationId: notification.notificationId },
        "Notification expired, skipping"
      );

      return {
        notificationId: notification.notificationId,
        delivered: [],
        failed: [],
        skipped: notification.channels.map((c) => ({
          channel: c,
          reason: "expired",
        })),
      };
    }
    return null;
  }

  /**
   * Check and handle deduplication
   */
  private async checkAndHandleDuplication(
    notification: NotificationJobData
  ): Promise<NotificationJobResult | null> {
    if (!notification.deduplicationKey) return null;

    const isDuplicate = await this.checkDuplication(
      notification.deduplicationKey,
      notification.deduplicationWindowMs || 3_600_000
    );

    if (isDuplicate) {
      logger.info(
        { notificationId: notification.notificationId },
        "Duplicate notification, skipping"
      );

      return {
        notificationId: notification.notificationId,
        delivered: [],
        failed: [],
        skipped: notification.channels.map((c) => ({
          channel: c,
          reason: "duplicate",
        })),
      };
    }
    return null;
  }

  /**
   * Get context for channel sending
   */
  private async getChannelContext(
    notification: NotificationJobData
  ): Promise<ChannelContext> {
    const [email, pushTokens, slackWebhook] = await Promise.all([
      getUserEmail(prisma, notification.userId),
      getUserPushTokens(prisma, notification.userId),
      getTeamSlackWebhook(prisma, notification.teamId),
    ]);

    return {
      email: email || undefined,
      pushTokens,
      slackWebhook: slackWebhook || undefined,
    };
  }

  /**
   * Process all channels for a notification
   */
  private async processChannels(
    notification: NotificationJobData,
    preferences: UserNotificationSettings,
    context: ChannelContext
  ): Promise<NotificationJobResult> {
    const inQuietHours = this.isInQuietHours(preferences);

    const delivered: NotificationJobResult["delivered"] = [];
    const failed: NotificationJobResult["failed"] = [];
    const skipped: NotificationJobResult["skipped"] = [];

    for (const channel of notification.channels) {
      // Skip non-urgent during quiet hours (except in_app)
      if (this.shouldSkipForQuietHours(notification, channel, inQuietHours)) {
        skipped.push({ channel, reason: "quiet_hours" });
        continue;
      }

      const result = dispatchToChannel(
        channel,
        notification,
        preferences,
        context
      );

      if (result === null) {
        failed.push({ channel, error: `Unknown channel: ${channel}` });
      } else if (result.success) {
        delivered.push(channel);
      } else {
        skipped.push({ channel, reason: result.error || "user_preference" });
      }
    }

    return {
      notificationId: notification.notificationId,
      delivered,
      failed,
      skipped,
    };
  }

  /**
   * Check if should skip channel for quiet hours
   */
  private shouldSkipForQuietHours(
    notification: NotificationJobData,
    channel: string,
    inQuietHours: boolean
  ): boolean {
    return (
      inQuietHours && notification.priority !== "urgent" && channel !== "in_app"
    );
  }

  /**
   * Mark notification as delivered
   */
  private async markDelivered(
    notification: NotificationJobData
  ): Promise<void> {
    if (notification.deduplicationKey) {
      await this.markAsDelivered(
        notification.deduplicationKey,
        notification.deduplicationWindowMs || 3_600_000
      );
    }
  }

  /**
   * Check if currently in quiet hours
   */
  private isInQuietHours(preferences: UserNotificationSettings): boolean {
    if (!(preferences.quietHoursStart && preferences.quietHoursEnd)) {
      return false;
    }

    const currentHour = new Date().getHours();
    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    if (start < end) {
      return currentHour >= start && currentHour < end;
    }
    // Spans midnight
    return currentHour >= start || currentHour < end;
  }

  /**
   * Check if notification is duplicate (placeholder)
   */
  private checkDuplication(_key: string, _windowMs: number): Promise<boolean> {
    // TODO: Implement deduplication check via Redis
    return Promise.resolve(false);
  }

  /**
   * Mark notification as delivered for deduplication (placeholder)
   */
  private markAsDelivered(_key: string, _windowMs: number): Promise<void> {
    // TODO: Implement deduplication mark via Redis
    return Promise.resolve();
  }
}
