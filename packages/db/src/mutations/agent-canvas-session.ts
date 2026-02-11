import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export function createNewSession(
  db: Database,
  data: {
    agentCanvasId: string;
    teamId: string;
    userId: string;
    title?: string;
  }
) {
  return db.agentCanvasSession.create({
    data: {
      agentCanvasId: data.agentCanvasId,
      teamId: data.teamId,
      userId: data.userId,
      title: data.title,
      status: "active",
      lastActivityAt: new Date(),
    },
  });
}

export function archiveSession(
  db: Database,
  sessionId: string,
  teamId: string
) {
  return db.agentCanvasSession.update({
    where: { id: sessionId, teamId },
    data: { status: "archived" },
  });
}

export function updateSessionTitle(
  db: Database,
  sessionId: string,
  title: string
) {
  return db.agentCanvasSession.update({
    where: { id: sessionId },
    data: { title },
  });
}

export function createOrGetSession(
  db: Database,
  data: {
    agentCanvasId: string;
    teamId: string;
    userId: string;
    title?: string;
  }
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.agentCanvasSession.findFirst({
      where: {
        agentCanvasId: data.agentCanvasId,
        teamId: data.teamId,
        userId: data.userId,
        status: "active",
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    return tx.agentCanvasSession.create({
      data: {
        agentCanvasId: data.agentCanvasId,
        teamId: data.teamId,
        userId: data.userId,
        title: data.title,
        status: "active",
        lastActivityAt: new Date(),
      },
    });
  });
}

export function appendSessionEvent(
  db: Database,
  sessionId: string,
  event: {
    teamId: string;
    agentCanvasId: string;
    executionId?: string;
    turnId?: string;
    eventType: string;
    source: string;
    visibility?: string;
    payload: unknown;
    eventTimestamp: Date;
  }
) {
  return db.$transaction(async (tx) => {
    const session = await tx.agentCanvasSession.update({
      where: { id: sessionId },
      data: {
        lastEventSequence: { increment: 1 },
        lastActivityAt: new Date(),
      },
      select: { lastEventSequence: true },
    });

    return tx.agentCanvasSessionEvent.create({
      data: {
        sessionId,
        teamId: event.teamId,
        agentCanvasId: event.agentCanvasId,
        executionId: event.executionId,
        turnId: event.turnId,
        sequence: session.lastEventSequence,
        eventType: event.eventType,
        source: event.source,
        visibility: event.visibility ?? "visible",
        payload: event.payload as Prisma.InputJsonValue,
        eventTimestamp: event.eventTimestamp,
      },
    });
  });
}

export function appendSessionEvents(
  db: Database,
  sessionId: string,
  events: Array<{
    teamId: string;
    agentCanvasId: string;
    executionId?: string;
    turnId?: string;
    eventType: string;
    source: string;
    visibility?: string;
    payload: unknown;
    eventTimestamp: Date;
  }>
) {
  if (events.length === 0) {
    return Promise.resolve([]);
  }

  return db.$transaction(async (tx) => {
    const session = await tx.agentCanvasSession.update({
      where: { id: sessionId },
      data: {
        lastEventSequence: { increment: events.length },
        lastActivityAt: new Date(),
      },
      select: { lastEventSequence: true },
    });

    const baseSequence = session.lastEventSequence - events.length;

    const records = events.map((event, index) => ({
      sessionId,
      teamId: event.teamId,
      agentCanvasId: event.agentCanvasId,
      executionId: event.executionId,
      turnId: event.turnId,
      sequence: baseSequence + index + 1,
      eventType: event.eventType,
      source: event.source,
      visibility: event.visibility ?? "visible",
      payload: event.payload as Prisma.InputJsonValue,
      eventTimestamp: event.eventTimestamp,
    }));

    await tx.agentCanvasSessionEvent.createMany({ data: records });

    return records;
  });
}

export function touchSession(db: Database, sessionId: string) {
  return db.agentCanvasSession.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  });
}

export function bindExecutionToSession(
  db: Database,
  executionId: string,
  sessionId: string,
  turnId?: string
) {
  return db.agentCanvasExecution.update({
    where: { id: executionId },
    data: { sessionId, turnId },
  });
}
