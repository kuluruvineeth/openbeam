import { relativeTime } from "./helpers";

type NotificationEntry = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  sourceType?: string | null;
  connectorId?: string | null;
  read: boolean;
  createdAt: string;
};

type ActivityEntry = {
  id: string;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  connectorType?: string | null;
  connectorId?: string | null;
  documentCount?: number | null;
  createdAt?: string | null;
};

export function formatNotificationList(
  notifications: NotificationEntry[],
  unreadCount: number
): string {
  if (notifications.length === 0) {
    return [
      "No notifications.",
      "",
      "Next steps:",
      "• Check activity feed: activity_feed for recent sync and connector events.",
    ].join("\n");
  }

  const rows = notifications.map((n) => {
    const status = n.read ? "  " : "* ";
    const age = relativeTime(n.createdAt);
    const body = n.body ? `\n    ${n.body.slice(0, 100)}` : "";
    return `${status}[${n.type}] ${n.title}  (${age})${body}`;
  });

  return [
    `${notifications.length} notifications (${unreadCount} unread):`,
    "",
    rows.join("\n"),
    "",
    "Next steps:",
    "• Mark as read: notifications_mark with notification IDs or markAll: true.",
    "• View activity: activity_feed for detailed sync and connector events.",
  ].join("\n");
}

export function formatNotificationMark(
  affected: number,
  markAll: boolean
): string {
  const scope = markAll ? "all" : `${affected}`;
  return [
    `Marked ${scope} notifications as read.`,
    "",
    "Next steps:",
    "• View remaining: notifications_list with unreadOnly: true.",
  ].join("\n");
}

export function formatActivityFeed(
  hours: number | null,
  entries: ActivityEntry[]
): string {
  const timeframe = hours ? `last ${hours} hours` : "recent";

  if (entries.length === 0) {
    return [
      `No activity in the ${timeframe}.`,
      "",
      "Next steps:",
      "• Search for documents: search_recent for recently indexed content.",
      "• Check connector health: sync_health for fleet status.",
    ].join("\n");
  }

  const rows = entries.map((e) => {
    const connector = e.connectorType ?? "unknown";
    const docs =
      e.documentCount != null && e.documentCount > 0
        ? ` (${e.documentCount} docs)`
        : "";
    const age = relativeTime(e.createdAt);
    return `• [${connector}] ${e.title ?? e.type ?? "activity"}${docs}  ${age}`;
  });

  return [
    `${entries.length} events in the ${timeframe}:`,
    "",
    rows.join("\n"),
    "",
    "Next steps:",
    "• Notifications: notifications_list for alerts and status changes.",
    "• Search new content: search_recent for recently indexed documents.",
    "• Connector details: connector_health with a connector ID above.",
  ].join("\n");
}
