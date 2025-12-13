import type { ConnectorAuditLog, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateAuditLogInput {
  connectorId: string;
  userId: string;
  action: string;
  changes: Prisma.InputJsonValue;
}

export const createAuditLog = async (
  db: Database,
  data: CreateAuditLogInput
): Promise<ConnectorAuditLog> => db.connectorAuditLog.create({ data });

export const createWebhookReceivedLog = async (
  db: Database,
  params: {
    connectorId: string;
    userId: string;
    eventId: string;
    eventType: string;
    source: string;
    syncJobId?: string;
    payload?: Prisma.InputJsonValue;
  }
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: params.connectorId,
      userId: params.userId,
      action: "WEBHOOK_RECEIVED",
      changes: {
        eventId: params.eventId,
        eventType: params.eventType,
        source: params.source,
        syncJobId: params.syncJobId,
        payload: params.payload,
        receivedAt: new Date().toISOString(),
      },
    },
  });

export const createWebhookProcessedLog = async (
  db: Database,
  params: {
    connectorId: string;
    userId: string;
    eventId: string;
    eventType: string;
    operations: Array<{
      operation: string;
      documentId: string;
      success: boolean;
    }>;
  }
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: params.connectorId,
      userId: params.userId,
      action: "WEBHOOK_PROCESSED",
      changes: {
        eventId: params.eventId,
        eventType: params.eventType,
        operations: params.operations,
        processedAt: new Date().toISOString(),
      },
    },
  });
