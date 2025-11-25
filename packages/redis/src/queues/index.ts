// === Sync & Indexing Queues ===

export * from "./action-queue";
export { closeActionQueue } from "./action-queue";
// === AI & Agent Queues ===
export * from "./agent-queue";
export { closeAgentQueue } from "./agent-queue";
// === Analytics & Metrics Queues ===
export * from "./analytics-queue";
export { closeAnalyticsQueue } from "./analytics-queue";
export * from "./cleanup-queue";
export { closeCleanupQueue } from "./cleanup-queue";
// === Data Management Queues ===
export * from "./export-queue";
export { closeExportQueue } from "./export-queue";
export * from "./index-queue";
export { closeIndexQueue } from "./index-queue";
// === Communication Queues ===
export * from "./notification-queue";
export { closeNotificationQueue } from "./notification-queue";
export * from "./sync-queue";
export { closeSyncQueue } from "./sync-queue";
export * from "./webhook-queue";
export { closeWebhookQueue } from "./webhook-queue";

// === Close All Queues ===
import { closeActionQueue } from "./action-queue";
import { closeAgentQueue } from "./agent-queue";
import { closeAnalyticsQueue } from "./analytics-queue";
import { closeCleanupQueue } from "./cleanup-queue";
import { closeExportQueue } from "./export-queue";
import { closeIndexQueue } from "./index-queue";
import { closeNotificationQueue } from "./notification-queue";
import { closeSyncQueue } from "./sync-queue";
import { closeWebhookQueue } from "./webhook-queue";

/**
 * Close all queues gracefully
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.allSettled([
    closeSyncQueue(),
    closeIndexQueue(),
    closeWebhookQueue(),
    closeCleanupQueue(),
    closeAgentQueue(),
    closeActionQueue(),
    closeAnalyticsQueue(),
    closeNotificationQueue(),
    closeExportQueue(),
  ]);
}
