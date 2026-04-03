import type { Database } from "../index";

export function markMcpNotificationsRead(
  db: Database,
  teamId: string,
  notificationIds: string[]
) {
  return db.mcpNotification.updateMany({
    where: { teamId, id: { in: notificationIds } },
    data: { read: true },
  });
}

export function markAllMcpNotificationsRead(db: Database, teamId: string) {
  return db.mcpNotification.updateMany({
    where: { teamId, read: false },
    data: { read: true },
  });
}

interface CreateNotificationData {
  teamId: string;
  type: string;
  title: string;
  body?: string;
  userId?: string;
  sourceType?: string;
  sourceId?: string;
  connectorId?: string;
  metadata?: Record<string, unknown>;
}

export function createMcpNotification(
  db: Database,
  data: CreateNotificationData
) {
  return db.mcpNotification.create({ data });
}

export function upsertMcpNotificationPreference(
  db: Database,
  params: {
    teamId: string;
    userId: string;
    channel: string;
    enabled: boolean;
  }
) {
  const { teamId, userId, channel, enabled } = params;
  return db.mcpNotificationPreference.upsert({
    where: {
      teamId_userId_channel: { teamId, userId, channel },
    },
    create: { teamId, userId, channel, enabled },
    update: { enabled },
  });
}
