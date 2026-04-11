import type { NotificationEventType } from "@openbeam/types/bot";

interface NotificationContent {
  title: string;
  icon: string;
  severity: "critical" | "warning" | "info" | "success";
}

const CONTENT_MAP: Record<NotificationEventType, NotificationContent> = {
  "connector.auth.expired": {
    title: "Connector Authentication Expired",
    icon: "key",
    severity: "critical",
  },
  "connector.sync.failed": {
    title: "Sync Failed",
    icon: "alert",
    severity: "warning",
  },
  "connector.sync.stalled": {
    title: "Sync Stalled",
    icon: "clock",
    severity: "warning",
  },
  "connector.health.degraded": {
    title: "Connector Health Degraded",
    icon: "heartbeat",
    severity: "warning",
  },
  "connector.health.restored": {
    title: "Connector Health Restored",
    icon: "check",
    severity: "success",
  },
  "connector.sync.completed": {
    title: "Sync Completed",
    icon: "sync",
    severity: "success",
  },
  "connector.new_available": {
    title: "New Connector Available",
    icon: "plus",
    severity: "info",
  },
  "document.mention": {
    title: "You Were Mentioned",
    icon: "at",
    severity: "info",
  },
  "document.shared_with_you": {
    title: "Document Shared With You",
    icon: "share",
    severity: "info",
  },
  "search.trending": {
    title: "Trending Search",
    icon: "trending",
    severity: "info",
  },
  "search.saved_alert": {
    title: "Saved Search Alert",
    icon: "bell",
    severity: "info",
  },
  "team.new_connector": {
    title: "New Connector Added",
    icon: "plug",
    severity: "info",
  },
  "team.member_joined": {
    title: "New Team Member",
    icon: "user",
    severity: "info",
  },
  "agent.task_completed": {
    title: "Agent Task Completed",
    icon: "check",
    severity: "success",
  },
  "agent.approval_required": {
    title: "Agent Approval Required",
    icon: "shield",
    severity: "warning",
  },
  "digest.ready": {
    title: "Your Digest Is Ready",
    icon: "mail",
    severity: "info",
  },
};

export function getNotificationContent(
  eventType: NotificationEventType
): NotificationContent {
  return CONTENT_MAP[eventType];
}

export function buildNotificationBody(
  eventType: NotificationEventType,
  payload: Record<string, unknown>
): string {
  const message = (payload.message as string) ?? "";
  const connectorName = (payload.connectorName as string) ?? "";
  const documentTitle = (payload.documentTitle as string) ?? "";
  const userName = (payload.userName as string) ?? "";

  switch (eventType) {
    case "connector.auth.expired":
      return connectorName
        ? `${connectorName} authentication has expired. Re-authenticate to resume syncing.`
        : "A connector's authentication has expired.";
    case "connector.sync.failed":
      return connectorName
        ? `${connectorName} sync failed. ${message}`
        : `Sync failed. ${message}`;
    case "connector.sync.stalled":
      return connectorName
        ? `${connectorName} sync appears stalled.`
        : "A sync appears stalled.";
    case "connector.health.degraded":
      return connectorName
        ? `${connectorName} health is degraded. ${message}`
        : `Connector health degraded. ${message}`;
    case "connector.health.restored":
      return connectorName
        ? `${connectorName} is healthy again.`
        : "Connector health restored.";
    case "connector.sync.completed": {
      const count = payload.documentCount ?? 0;
      return connectorName
        ? `${connectorName} synced ${count} documents.`
        : `Sync completed. ${count} documents processed.`;
    }
    case "connector.new_available":
      return connectorName
        ? `${connectorName} is now available to connect.`
        : "A new connector is available.";
    case "document.mention":
      return documentTitle
        ? `You were mentioned in "${documentTitle}".`
        : "You were mentioned in a document.";
    case "document.shared_with_you":
      return documentTitle
        ? `"${documentTitle}" was shared with you.`
        : "A document was shared with you.";
    case "search.trending":
      return message || "A search topic is trending in your team.";
    case "search.saved_alert":
      return message || "Your saved search has new results.";
    case "team.new_connector":
      return connectorName
        ? `${connectorName} was added to your team.`
        : "A new connector was added.";
    case "team.member_joined":
      return userName
        ? `${userName} joined your team.`
        : "A new member joined your team.";
    case "agent.task_completed":
      return message || "An agent task has completed.";
    case "agent.approval_required":
      return message || "An agent needs your approval to proceed.";
    case "digest.ready":
      return message || "Your activity digest is ready.";
    default:
      return message || "You have a new notification.";
  }
}

export type { NotificationContent };
