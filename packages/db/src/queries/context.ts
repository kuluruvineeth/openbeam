import type { Database } from "../index";

export function findContextEntry(db: Database, teamId: string, uri: string) {
  return db.contextEntry.findUnique({
    where: { teamId_uri: { teamId, uri } },
  });
}

export function listContextChildren(
  db: Database,
  teamId: string,
  parentUri: string
) {
  return db.contextEntry.findMany({
    where: { teamId, parentUri },
    orderBy: { activeCount: "desc" },
  });
}

export function listContextByType(
  db: Database,
  params: {
    teamId: string;
    contextType: string;
    limit?: number;
    offset?: number;
  }
) {
  const { teamId, contextType, limit = 50, offset = 0 } = params;
  return db.contextEntry.findMany({
    where: { teamId, contextType },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function findContextRelations(
  db: Database,
  teamId: string,
  sourceUri: string
) {
  return db.contextRelation.findMany({
    where: { teamId, sourceUri },
    orderBy: { createdAt: "desc" },
  });
}

export function findContextSession(db: Database, sessionId: string) {
  return db.contextSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      extractions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

export function listContextSessions(
  db: Database,
  teamId: string,
  userId: string,
  limit = 20
) {
  return db.contextSession.findMany({
    where: { teamId, userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      agentId: true,
      totalTokens: true,
      archiveCount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
