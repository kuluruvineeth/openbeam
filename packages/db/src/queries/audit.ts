/**
 * Audit Queries
 * Query functions for connector audit logs, sync events, and dead letters
 */

import type {
  ConnectorAuditLog,
  SyncDeadLetter,
  SyncEvent,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface ListAuditLogsOptions {
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogListResult {
  logs: ConnectorAuditLog[];
  total: number;
}

export interface ListSyncEventsOptions {
  eventType?: string;
  limit?: number;
  offset?: number;
}

export interface SyncEventListResult {
  events: SyncEvent[];
  total: number;
}

export interface ListDeadLettersOptions {
  status?: "pending" | "retrying" | "resolved" | "abandoned";
  errorType?: string;
  limit?: number;
  offset?: number;
}

export interface DeadLetterListResult {
  items: SyncDeadLetter[];
  total: number;
}

export interface AuditActionCount {
  action: string;
  count: number;
}

// ============================================================================
// Connector Audit Log Queries
// ============================================================================

/**
 * List connector audit logs
 */
export const listConnectorAuditLogs = async (
  db: Database,
  connectorId: string,
  options: ListAuditLogsOptions = {}
): Promise<AuditLogListResult> => {
  const {
    action,
    userId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  const where = {
    connectorId,
    ...(action && { action }),
    ...(userId && { userId }),
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(endDate && { createdAt: { lte: endDate } }),
  };

  const [logs, total] = await Promise.all([
    db.connectorAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.connectorAuditLog.count({ where }),
  ]);

  return { logs, total };
};

/**
 * Get audit action types with counts
 */
export const getAuditActionTypes = async (
  db: Database,
  connectorId: string
): Promise<AuditActionCount[]> => {
  const result = await db.connectorAuditLog.groupBy({
    by: ["action"],
    where: { connectorId },
    _count: { action: true },
  });

  return result.map((r) => ({
    action: r.action,
    count: r._count.action,
  }));
};

// ============================================================================
// Sync Event Queries
// ============================================================================

/**
 * List sync events for a job
 */
export const listSyncEvents = async (
  db: Database,
  syncJobId: string,
  options: ListSyncEventsOptions = {}
): Promise<SyncEventListResult> => {
  const { eventType, limit = 50, offset = 0 } = options;

  const where = {
    syncJobId,
    ...(eventType && { eventType: eventType as any }),
  };

  const [events, total] = await Promise.all([
    db.syncEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.syncEvent.count({ where }),
  ]);

  return { events, total };
};

/**
 * Verify sync job belongs to team
 */
export const verifySyncJobTeamAccess = async (
  db: Database,
  syncJobId: string,
  teamId: string
): Promise<boolean> => {
  const syncJob = await db.syncJob.findUnique({
    where: { id: syncJobId },
    include: { connector: { select: { teamId: true } } },
  });

  return syncJob?.connector.teamId === teamId;
};

// ============================================================================
// Dead Letter Queries
// ============================================================================

/**
 * List dead letter items for a connector
 */
export const listDeadLetters = async (
  db: Database,
  connectorId: string,
  options: ListDeadLettersOptions = {}
): Promise<DeadLetterListResult> => {
  const { status, errorType, limit = 50, offset = 0 } = options;

  const where = {
    connectorId,
    ...(status && { status }),
    ...(errorType && { errorType }),
  };

  const [items, total] = await Promise.all([
    db.syncDeadLetter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.syncDeadLetter.count({ where }),
  ]);

  return { items, total };
};

/**
 * Get dead letter by ID with team verification
 */
export const getDeadLetterById = async (
  db: Database,
  deadLetterId: string,
  teamId: string
): Promise<SyncDeadLetter | null> => {
  const item = await db.syncDeadLetter.findUnique({
    where: { id: deadLetterId },
  });

  if (!item) return null;

  // Verify team ownership through connector
  const connector = await db.connector.findFirst({
    where: { id: item.connectorId, teamId },
  });

  return connector ? item : null;
};
