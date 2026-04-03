import type { Database } from "../index";

interface ListNotificationsOptions {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  type?: string;
}

export async function listMcpNotifications(
  db: Database,
  teamId: string,
  options: ListNotificationsOptions
) {
  const { limit = 25, cursor, unreadOnly = false, type } = options;

  const where: Record<string, unknown> = { teamId };
  if (unreadOnly) {
    where.read = false;
  }
  if (type) {
    where.type = type;
  }
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const notifications = await db.mcpNotification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, -1) : notifications;
  const nextCursor =
    hasMore && items.length > 0
      ? (items.at(-1)?.createdAt.toISOString() ?? null)
      : null;

  return { items, nextCursor, hasMore };
}

export function getUnreadNotificationCount(db: Database, teamId: string) {
  return db.mcpNotification.count({
    where: { teamId, read: false },
  });
}

export function getMcpNotificationPreferences(
  db: Database,
  teamId: string,
  userId: string
) {
  return db.mcpNotificationPreference.findMany({
    where: { teamId, userId },
  });
}
