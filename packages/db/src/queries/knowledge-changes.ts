import type {
  ActivityEvent,
  DocumentChange,
  UserEntityAffinity,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface UnprocessedChangesScope {
  teamId: string;
  connectorId?: string;
  syncHistoryId?: string;
}

export function fetchUnprocessedChanges(
  db: Database,
  scope: UnprocessedChangesScope,
  options: { limit?: number } = {}
): Promise<DocumentChange[]> {
  const { limit = 1000 } = options;

  const where = {
    teamId: scope.teamId,
    processedAt: null as null,
    ...(scope.connectorId ? { connectorId: scope.connectorId } : {}),
    ...(scope.syncHistoryId
      ? {
          metadata: {
            path: ["syncHistoryId"],
            equals: scope.syncHistoryId,
          },
        }
      : {}),
  };

  return db.documentChange.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export function countUnprocessedChanges(
  db: Database,
  scope: UnprocessedChangesScope
): Promise<number> {
  const where = {
    teamId: scope.teamId,
    processedAt: null as null,
    ...(scope.connectorId ? { connectorId: scope.connectorId } : {}),
    ...(scope.syncHistoryId
      ? {
          metadata: {
            path: ["syncHistoryId"],
            equals: scope.syncHistoryId,
          },
        }
      : {}),
  };

  return db.documentChange.count({
    where,
  });
}

export function fetchActivityEventsForUser(
  db: Database,
  teamId: string,
  userId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ActivityEvent[]> {
  const { startDate, endDate, action, limit = 100, offset = 0 } = options;

  return db.activityEvent.findMany({
    where: {
      teamId,
      userId,
      action,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getUserEntityAffinities(
  db: Database,
  teamId: string,
  userId: string,
  options: { minScore?: number; limit?: number } = {}
): Promise<UserEntityAffinity[]> {
  const { minScore = 0, limit = 50 } = options;

  return db.userEntityAffinity.findMany({
    where: {
      teamId,
      userId,
      score: { gt: minScore },
    },
    orderBy: { score: "desc" },
    take: limit,
  });
}
