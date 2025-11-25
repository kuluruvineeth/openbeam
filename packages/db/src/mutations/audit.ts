/**
 * Audit Mutations
 * Mutation functions for audit logs, sync events, and dead letters
 */

import type {
  ConnectorAuditLog,
  Prisma,
  SyncDeadLetter,
  SyncEvent,
  SyncEventType,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface CreateAuditLogInput {
  connectorId: string;
  userId: string;
  action: string;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export interface CreateSyncEventInput {
  syncJobId: string;
  eventType: SyncEventType;
  message?: string;
  resource?: string;
  documentId?: string;
  details?: Prisma.InputJsonValue;
  errorCode?: string;
  errorMessage?: string;
}

// ============================================================================
// Connector Audit Log Mutations
// ============================================================================

/**
 * Create connector audit log entry
 */
export const createConnectorAuditLog = async (
  db: Database,
  data: CreateAuditLogInput
): Promise<ConnectorAuditLog> =>
  db.connectorAuditLog.create({
    data: {
      connectorId: data.connectorId,
      userId: data.userId,
      action: data.action,
      changes: data.changes ?? {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      success: data.success ?? true,
      errorMessage: data.errorMessage,
    },
  });

// ============================================================================
// Sync Event Mutations
// ============================================================================

/**
 * Create sync event
 */
export const createSyncEvent = async (
  db: Database,
  data: CreateSyncEventInput
): Promise<SyncEvent> =>
  db.syncEvent.create({
    data: {
      syncJobId: data.syncJobId,
      eventType: data.eventType,
      message: data.message,
      resource: data.resource,
      documentId: data.documentId,
      details: data.details ?? {},
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
    },
  });

/**
 * Bulk create sync events
 */
export const bulkCreateSyncEvents = async (
  db: Database,
  events: CreateSyncEventInput[]
): Promise<number> => {
  const result = await db.syncEvent.createMany({
    data: events.map((e) => ({
      syncJobId: e.syncJobId,
      eventType: e.eventType,
      message: e.message,
      resource: e.resource,
      documentId: e.documentId,
      details: e.details ?? {},
      errorCode: e.errorCode,
      errorMessage: e.errorMessage,
    })),
  });

  return result.count;
};

// ============================================================================
// Dead Letter Mutations
// ============================================================================

/**
 * Retry a dead letter item
 */
export const retryDeadLetter = async (
  db: Database,
  deadLetterId: string
): Promise<SyncDeadLetter> =>
  db.syncDeadLetter.update({
    where: { id: deadLetterId },
    data: {
      status: "retrying",
      retryCount: { increment: 1 },
      lastRetryAt: new Date(),
    },
  });

/**
 * Resolve a dead letter item
 */
export const resolveDeadLetter = async (
  db: Database,
  deadLetterId: string,
  userId: string,
  resolution: "skipped" | "manual_fix" | "retried"
): Promise<SyncDeadLetter> =>
  db.syncDeadLetter.update({
    where: { id: deadLetterId },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution,
    },
  });

/**
 * Abandon a dead letter item
 */
export const abandonDeadLetter = async (
  db: Database,
  deadLetterId: string
): Promise<SyncDeadLetter> =>
  db.syncDeadLetter.update({
    where: { id: deadLetterId },
    data: { status: "abandoned" },
  });

/**
 * Create dead letter entry
 */
export const createDeadLetter = async (
  db: Database,
  data: {
    connectorId: string;
    syncJobId?: string;
    externalId: string;
    documentType: string;
    rawData?: Prisma.InputJsonValue;
    errorType: string;
    errorMessage: string;
    errorStack?: string;
  }
): Promise<SyncDeadLetter> => db.syncDeadLetter.create({ data });
