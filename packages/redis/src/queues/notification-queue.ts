/**
 * Notification Queue
 *
 * Handles user notifications across multiple channels (in-app, email, push, slack).
 * Supports batching, deduplication, and user preferences.
 */
import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

// === Notification Types ===

export type NotificationChannel =
  | "in_app"
  | "email"
  | "push"
  | "slack"
  | "teams";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationType =
  // Search & Discovery
  | "search_alert" // Saved search has new results
  | "mention" // User was mentioned
  | "share" // Document was shared
  // AI & Chat
  | "agent_complete" // Agent execution completed
  | "ai_answer_ready" // AI answer is ready (for async queries)
  // Actions & Workflows
  | "action_pending" // Action requires confirmation
  | "action_complete" // Action completed
  | "workflow_complete" // Workflow completed
  | "workflow_failed" // Workflow failed
  // Sync & Connectors
  | "sync_complete" // Connector sync completed
  | "sync_error" // Connector sync failed
  | "connector_disconnected" // OAuth token expired
  // Team & Admin
  | "team_invite" // Invited to team
  | "role_changed" // User role changed
  | "usage_warning" // Approaching usage limits
  | "security_alert" // Security-related notification
  // System
  | "system" // System notification
  | "announcement"; // Product announcement

export interface NotificationJobData {
  notificationId: string;
  teamId: string;
  userId: string; // Recipient

  // Notification content
  type: NotificationType;
  title: string;
  body: string;
  bodyHtml?: string;

  // Delivery
  channels: NotificationChannel[];
  priority: NotificationPriority;

  // Action
  actionUrl?: string;
  actionLabel?: string;

  // Context
  resourceType?: string; // "document", "conversation", "action", etc.
  resourceId?: string;
  resourceName?: string;

  // Sender (if applicable)
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;

  // Grouping (for batching)
  groupKey?: string; // Notifications with same key can be batched
  groupName?: string;

  // Metadata
  metadata?: Record<string, unknown>;

  // Scheduling
  sendAt?: number; // Unix timestamp for scheduled delivery
  expiresAt?: number; // Don't deliver after this time

  // Deduplication
  deduplicationKey?: string; // Only one notification per key in time window
  deduplicationWindowMs?: number; // Default: 1 hour

  // Tracing
  traceContext?: TraceContext;
}

export interface NotificationJobResult {
  notificationId: string;
  delivered: NotificationChannel[];
  failed: Array<{
    channel: NotificationChannel;
    error: string;
  }>;
  skipped: Array<{
    channel: NotificationChannel;
    reason: string; // "user_preference", "rate_limited", "duplicate"
  }>;
}

// === Queue Configuration ===

export const NOTIFICATION_QUEUE_NAME = "notification";

export const notificationQueue = new Queue<
  NotificationJobData,
  NotificationJobResult
>(NOTIFICATION_QUEUE_NAME, {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // Keep failures for 7 days
    },
  },
});

// === Queue Operations ===

/**
 * Send a notification
 */
export async function sendNotification(
  data: Omit<NotificationJobData, "notificationId" | "traceContext">,
  options?: {
    delay?: number;
  }
) {
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const jobData: NotificationJobData = {
    ...data,
    notificationId,
    traceContext: extractTraceContext(),
  };

  // Calculate delay if sendAt is specified
  let delay = options?.delay;
  if (data.sendAt && !delay) {
    delay = Math.max(0, data.sendAt - Date.now());
  }

  // Priority based on notification priority
  const priorityMap: Record<NotificationPriority, number> = {
    urgent: 10,
    high: 7,
    normal: 5,
    low: 2,
  };

  return await notificationQueue.add("send", jobData, {
    priority: priorityMap[data.priority],
    delay,
    jobId: data.deduplicationKey || notificationId,
  });
}

/**
 * Send a batch of notifications (more efficient)
 */
export async function sendNotificationsBatch(
  notifications: Array<
    Omit<NotificationJobData, "notificationId" | "traceContext">
  >
) {
  const jobs = notifications.map((data, index) => {
    const notificationId = `notif-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`;

    const priorityMap: Record<NotificationPriority, number> = {
      urgent: 10,
      high: 7,
      normal: 5,
      low: 2,
    };

    return {
      name: "send",
      data: {
        ...data,
        notificationId,
        traceContext: extractTraceContext(),
      } as NotificationJobData,
      opts: {
        priority: priorityMap[data.priority],
        jobId: data.deduplicationKey || notificationId,
      },
    };
  });

  return await notificationQueue.addBulk(jobs);
}

// === Convenience Functions ===

/**
 * Send a search alert notification
 */
export async function sendSearchAlert(params: {
  teamId: string;
  userId: string;
  savedSearchId: string;
  savedSearchName: string;
  newResultsCount: number;
  searchUrl: string;
}) {
  return await sendNotification({
    teamId: params.teamId,
    userId: params.userId,
    type: "search_alert",
    title: `New results for "${params.savedSearchName}"`,
    body: `${params.newResultsCount} new result${params.newResultsCount > 1 ? "s" : ""} found.`,
    channels: ["in_app", "email"],
    priority: "normal",
    actionUrl: params.searchUrl,
    actionLabel: "View Results",
    resourceType: "saved_search",
    resourceId: params.savedSearchId,
    groupKey: `search-alert-${params.savedSearchId}`,
    deduplicationKey: `search-alert-${params.savedSearchId}`,
    deduplicationWindowMs: 3_600_000, // 1 hour
  });
}

/**
 * Send an agent completion notification
 */
export async function sendAgentCompleteNotification(params: {
  teamId: string;
  userId: string;
  executionId: string;
  task: string;
  success: boolean;
  resultSummary?: string;
}) {
  return await sendNotification({
    teamId: params.teamId,
    userId: params.userId,
    type: "agent_complete",
    title: params.success ? "Research Complete" : "Research Failed",
    body: params.resultSummary || `Task: ${params.task.slice(0, 100)}...`,
    channels: ["in_app"],
    priority: params.success ? "normal" : "high",
    actionUrl: `/chat?execution=${params.executionId}`,
    actionLabel: "View Results",
    resourceType: "agent_execution",
    resourceId: params.executionId,
  });
}

/**
 * Send an action confirmation request
 */
export async function sendActionConfirmationRequest(params: {
  teamId: string;
  userId: string;
  executionId: string;
  actionName: string;
  actionDescription: string;
  isDestructive: boolean;
}) {
  return await sendNotification({
    teamId: params.teamId,
    userId: params.userId,
    type: "action_pending",
    title: `Action requires confirmation: ${params.actionName}`,
    body: params.actionDescription,
    channels: ["in_app", ...(params.isDestructive ? ["email" as const] : [])],
    priority: params.isDestructive ? "high" : "normal",
    actionUrl: `/actions/confirm/${params.executionId}`,
    actionLabel: "Review & Confirm",
    resourceType: "action_execution",
    resourceId: params.executionId,
  });
}

/**
 * Send a connector error notification
 */
export async function sendConnectorErrorNotification(params: {
  teamId: string;
  adminUserIds: string[];
  connectorId: string;
  connectorName: string;
  error: string;
}) {
  const notifications = params.adminUserIds.map((userId) => ({
    teamId: params.teamId,
    userId,
    type: "sync_error" as const,
    title: `Connector error: ${params.connectorName}`,
    body: params.error.slice(0, 200),
    channels: ["in_app", "email"] as NotificationChannel[],
    priority: "high" as const,
    actionUrl: `/settings/connectors/${params.connectorId}`,
    actionLabel: "View Connector",
    resourceType: "connector",
    resourceId: params.connectorId,
    groupKey: `connector-error-${params.connectorId}`,
    deduplicationKey: `connector-error-${params.connectorId}`,
    deduplicationWindowMs: 3_600_000, // 1 hour
  }));

  return await sendNotificationsBatch(notifications);
}

/**
 * Send a usage warning notification
 */
export async function sendUsageWarningNotification(params: {
  teamId: string;
  adminUserIds: string[];
  resourceType: "documents" | "storage" | "api_calls" | "ai_tokens";
  currentUsage: number;
  limit: number;
  percentUsed: number;
}) {
  const notifications = params.adminUserIds.map((userId) => ({
    teamId: params.teamId,
    userId,
    type: "usage_warning" as const,
    title: `Usage warning: ${params.resourceType}`,
    body: `You've used ${params.percentUsed}% of your ${params.resourceType} limit (${params.currentUsage}/${params.limit}).`,
    channels: ["in_app", "email"] as NotificationChannel[],
    priority:
      params.percentUsed >= 90 ? ("urgent" as const) : ("high" as const),
    actionUrl: "/settings/billing",
    actionLabel: "View Usage",
    resourceType: "team",
    resourceId: params.teamId,
    groupKey: `usage-warning-${params.teamId}-${params.resourceType}`,
    deduplicationKey: `usage-warning-${params.teamId}-${params.resourceType}`,
    deduplicationWindowMs: 86_400_000, // 24 hours
  }));

  return await sendNotificationsBatch(notifications);
}

/**
 * Get notification queue metrics
 */
export async function getNotificationQueueMetrics() {
  const counts = await notificationQueue.getJobCounts();
  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    total:
      (counts.waiting || 0) +
      (counts.active || 0) +
      (counts.completed || 0) +
      (counts.failed || 0) +
      (counts.delayed || 0),
  };
}

/**
 * Close the notification queue
 */
export async function closeNotificationQueue(): Promise<void> {
  await notificationQueue.close();
}
