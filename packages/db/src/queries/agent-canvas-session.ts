import type { Database } from "../index";

export function findSessionById(
  db: Database,
  sessionId: string,
  teamId: string
) {
  return db.agentCanvasSession.findFirst({
    where: { id: sessionId, teamId },
  });
}

export function findLatestSession(
  db: Database,
  agentCanvasId: string,
  teamId: string,
  userId: string
) {
  return db.agentCanvasSession.findFirst({
    where: {
      agentCanvasId,
      teamId,
      userId,
      status: "active",
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function listSessions(
  db: Database,
  agentCanvasId: string,
  teamId: string,
  options: { limit?: number; offset?: number; userId?: string } = {}
) {
  const { limit = 20, offset = 0, userId } = options;

  return db.agentCanvasSession.findMany({
    where: {
      agentCanvasId,
      teamId,
      status: "active",
      ...(userId ? { userId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      agentCanvasId: true,
      teamId: true,
      userId: true,
      title: true,
      status: true,
      lastEventSequence: true,
      lastActivityAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export function listSessionEvents(
  db: Database,
  sessionId: string,
  options: { limit?: number; cursorSequence?: number } = {}
) {
  const { limit = 100, cursorSequence } = options;

  return db.agentCanvasSessionEvent.findMany({
    where: {
      sessionId,
      ...(cursorSequence !== undefined
        ? { sequence: { gt: cursorSequence } }
        : {}),
    },
    orderBy: { sequence: "asc" },
    take: limit,
  });
}

export function listSessionEventsAfterSequence(
  db: Database,
  sessionId: string,
  afterSequence: number,
  limit = 100
) {
  return db.agentCanvasSessionEvent.findMany({
    where: {
      sessionId,
      sequence: { gt: afterSequence },
    },
    orderBy: { sequence: "asc" },
    take: limit,
  });
}
