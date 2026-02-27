import type { Database } from "../index";

export function findVoiceNoteById(
  db: Database,
  id: string,
  userId: string,
  teamId: string
) {
  return db.voiceNote.findFirst({
    where: { id, userId, teamId },
  });
}

export function listVoiceNotes(
  db: Database,
  userId: string,
  teamId: string,
  options: {
    limit?: number;
    cursor?: string;
    search?: string;
  } = {}
) {
  const { limit = 20, cursor, search } = options;

  return db.voiceNote.findMany({
    where: {
      userId,
      teamId,
      ...(search && {
        text: { contains: search, mode: "insensitive" as const },
      }),
      ...(cursor && { id: { lt: cursor } }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function countVoiceNotes(db: Database, userId: string, teamId: string) {
  return db.voiceNote.count({ where: { userId, teamId } });
}

export function findVoiceSettings(db: Database, userId: string) {
  return db.voiceSettings.findUnique({ where: { userId } });
}

export function findVoiceSessionById(db: Database, id: string) {
  return db.voiceSession.findUnique({ where: { id } });
}

export function findActiveVoiceSession(
  db: Database,
  userId: string,
  teamId: string
) {
  return db.voiceSession.findFirst({
    where: { userId, teamId, status: "active" },
    orderBy: { startedAt: "desc" },
  });
}

export function listVoiceSessions(
  db: Database,
  userId: string,
  teamId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
) {
  const { limit = 20, offset = 0 } = options;

  return db.voiceSession.findMany({
    where: { userId, teamId },
    orderBy: { startedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getVoiceSessionStats(
  db: Database,
  userId: string,
  teamId: string,
  since: Date
) {
  return db.voiceSession.aggregate({
    where: {
      userId,
      teamId,
      status: "completed",
      startedAt: { gte: since },
    },
    _count: true,
    _sum: {
      duration: true,
      wordsSpoken: true,
      toolCalls: true,
    },
  });
}
