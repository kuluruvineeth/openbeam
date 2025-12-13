import type { ConnectorAuditLog, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export const findAuditLogByEventId = async (
  db: Database,
  connectorId: string,
  eventId: string
): Promise<ConnectorAuditLog | null> =>
  db.connectorAuditLog.findFirst({
    where: {
      connectorId,
      action: "WEBHOOK_RECEIVED",
      changes: { path: ["eventId"], equals: eventId },
    },
    orderBy: { createdAt: "desc" },
  });

export const findAuditLogsByConnector = (
  db: Database,
  connectorId: string,
  options?: {
    action?: string;
    startTime?: Date;
    endTime?: Date;
    take?: number;
  }
): Promise<ConnectorAuditLog[]> => {
  const where: Prisma.ConnectorAuditLogWhereInput = { connectorId };

  if (options?.action) {
    where.action = options.action;
  }

  if (options?.startTime || options?.endTime) {
    where.createdAt = {};
    if (options.startTime) {
      where.createdAt.gte = options.startTime;
    }
    if (options.endTime) {
      where.createdAt.lte = options.endTime;
    }
  }

  return db.connectorAuditLog.findMany({
    where,
    take: options?.take,
    orderBy: { createdAt: "asc" },
  });
};

export const findWebhookAuditLogs = async (
  db: Database,
  connectorId: string,
  options: { startTime: Date; endTime: Date }
): Promise<ConnectorAuditLog[]> =>
  db.connectorAuditLog.findMany({
    where: {
      connectorId,
      action: "WEBHOOK_RECEIVED",
      createdAt: { gte: options.startTime, lte: options.endTime },
    },
    orderBy: { createdAt: "asc" },
  });
