import type { ConnectorAuditLog, Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export type ConnectorAuditAction =
  | "CONNECTOR_CREATED"
  | "CONNECTOR_UPDATED"
  | "CONNECTOR_DELETED"
  | "CONNECTOR_ENABLED"
  | "CONNECTOR_DISABLED"
  | "CONNECTOR_AUTHENTICATED"
  | "CONNECTOR_DISCONNECTED"
  | "TOKEN_REFRESHED"
  | "SYNC_STARTED"
  | "SYNC_COMPLETED"
  | "SYNC_FAILED"
  | "WEBHOOK_RECEIVED"
  | "WEBHOOK_PROCESSED"
  | "WEBHOOK_FAILED"
  | "DOCUMENT_INDEXED"
  | "DOCUMENT_UPDATED"
  | "DOCUMENT_DELETED"
  | "RATE_LIMIT_HIT"
  | "AUTH_ERROR"
  | "PERMISSION_CHANGED";

export interface CreateAuditLogInput {
  connectorId: string;
  userId: string;
  action: ConnectorAuditAction;
  changes: Prisma.InputJsonValue;
}

export const createAuditLog = (
  db: Database,
  data: CreateAuditLogInput
): Promise<ConnectorAuditLog> => db.connectorAuditLog.create({ data });

export const createConnectorLifecycleLog = (
  db: Database,
  params: {
    connectorId: string;
    userId: string;
    action:
      | "CONNECTOR_CREATED"
      | "CONNECTOR_UPDATED"
      | "CONNECTOR_DELETED"
      | "CONNECTOR_ENABLED"
      | "CONNECTOR_DISABLED";
    previousState?: Prisma.InputJsonValue;
    newState?: Prisma.InputJsonValue;
    reason?: string;
  }
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: params.connectorId,
      userId: params.userId,
      action: params.action,
      changes: {
        previousState: params.previousState,
        newState: params.newState,
        reason: params.reason,
        timestamp: new Date().toISOString(),
      },
    },
  });

export const createAuthLog = (
  db: Database,
  params: {
    connectorId: string;
    userId: string;
    action:
      | "CONNECTOR_AUTHENTICATED"
      | "CONNECTOR_DISCONNECTED"
      | "TOKEN_REFRESHED"
      | "AUTH_ERROR";
    provider?: string;
    errorMessage?: string;
    tokenExpiresAt?: Date;
  }
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: params.connectorId,
      userId: params.userId,
      action: params.action,
      changes: {
        provider: params.provider,
        errorMessage: params.errorMessage,
        tokenExpiresAt: params.tokenExpiresAt?.toISOString(),
        timestamp: new Date().toISOString(),
      },
    },
  });

export const createSyncLog = (
  db: Database,
  params: {
    connectorId: string;
    userId: string;
    action: "SYNC_STARTED" | "SYNC_COMPLETED" | "SYNC_FAILED";
    syncHistoryId?: string;
    syncType?: "full" | "incremental";
    documentsProcessed?: number;
    durationMs?: number;
    errorMessage?: string;
    cursor?: string;
  }
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: params.connectorId,
      userId: params.userId,
      action: params.action,
      changes: {
        syncHistoryId: params.syncHistoryId,
        syncType: params.syncType,
        documentsProcessed: params.documentsProcessed,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage,
        cursor: params.cursor,
        timestamp: new Date().toISOString(),
      },
    },
  });

export const createWebhookReceivedLog = (
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

export const createWebhookProcessedLog = (
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

export const createDocumentOperationLog = (
  db: Database,
  params: {
    connectorId: string;
    userId: string;
    action: "DOCUMENT_INDEXED" | "DOCUMENT_UPDATED" | "DOCUMENT_DELETED";
    documentId: string;
    externalId?: string;
    documentType?: string;
    batchId?: string;
  }
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: params.connectorId,
      userId: params.userId,
      action: params.action,
      changes: {
        documentId: params.documentId,
        externalId: params.externalId,
        documentType: params.documentType,
        batchId: params.batchId,
        timestamp: new Date().toISOString(),
      },
    },
  });

export const createRateLimitLog = (
  db: Database,
  params: {
    connectorId: string;
    userId: string;
    endpoint: string;
    retryAfterSeconds?: number;
    requestCount?: number;
  }
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: params.connectorId,
      userId: params.userId,
      action: "RATE_LIMIT_HIT",
      changes: {
        endpoint: params.endpoint,
        retryAfterSeconds: params.retryAfterSeconds,
        requestCount: params.requestCount,
        timestamp: new Date().toISOString(),
      },
    },
  });

export interface GetAuditLogsOptions {
  connectorId?: string;
  userId?: string;
  actions?: ConnectorAuditAction[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export const getAuditLogs = (
  db: Database,
  teamId: string,
  options: GetAuditLogsOptions = {}
): Promise<ConnectorAuditLog[]> => {
  const {
    connectorId,
    userId,
    actions,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  return db.connectorAuditLog.findMany({
    where: {
      connector: { teamId },
      connectorId,
      userId,
      action: actions ? { in: actions } : undefined,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

export const getAuditLogsByConnector = (
  db: Database,
  connectorId: string,
  options: Omit<GetAuditLogsOptions, "connectorId"> = {}
): Promise<ConnectorAuditLog[]> => {
  const {
    userId,
    actions,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  return db.connectorAuditLog.findMany({
    where: {
      connectorId,
      userId,
      action: actions ? { in: actions } : undefined,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

export const countAuditLogsByAction = async (
  db: Database,
  connectorId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<Record<string, number>> => {
  const { startDate, endDate } = options;

  const results = await db.connectorAuditLog.groupBy({
    by: ["action"],
    where: {
      connectorId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
  });

  return Object.fromEntries(results.map((r) => [r.action, r._count]));
};

export const getRecentSyncLogs = (
  db: Database,
  connectorId: string,
  limit = 10
): Promise<ConnectorAuditLog[]> =>
  db.connectorAuditLog.findMany({
    where: {
      connectorId,
      action: { in: ["SYNC_STARTED", "SYNC_COMPLETED", "SYNC_FAILED"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const getRecentErrors = (
  db: Database,
  connectorId: string,
  limit = 10
): Promise<ConnectorAuditLog[]> =>
  db.connectorAuditLog.findMany({
    where: {
      connectorId,
      action: {
        in: ["SYNC_FAILED", "WEBHOOK_FAILED", "AUTH_ERROR", "RATE_LIMIT_HIT"],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

export const deleteOldAuditLogs = (
  db: Database,
  connectorId: string,
  olderThan: Date
): Promise<{ count: number }> =>
  db.connectorAuditLog.deleteMany({
    where: {
      connectorId,
      createdAt: { lt: olderThan },
    },
  });
