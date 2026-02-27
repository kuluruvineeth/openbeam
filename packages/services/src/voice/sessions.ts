import {
  createVoiceSession,
  type Database,
  endVoiceSession,
  findActiveVoiceSession,
  findVoiceSessionById,
  getVoiceSessionStats,
  listVoiceSessions,
  updateVoiceSession,
} from "@openplane/db";
import type { VoiceRoomType } from "@openplane/types/services/voice";

export async function startSession(
  db: Database,
  userId: string,
  teamId: string,
  room: { type: VoiceRoomType; name?: string }
) {
  const existing = await findActiveVoiceSession(db, userId, teamId);
  if (existing) {
    await updateVoiceSession(db, existing.id, {
      status: "error",
      endedAt: new Date(),
    });
  }

  return createVoiceSession(db, {
    userId,
    teamId,
    roomType: room.type,
    roomName: room.name,
  });
}

export function completeSession(
  db: Database,
  sessionId: string,
  data: {
    duration: number;
    wordsSpoken: number;
    toolCalls: number;
  }
) {
  return endVoiceSession(db, sessionId, data);
}

export function failSession(db: Database, sessionId: string) {
  return updateVoiceSession(db, sessionId, {
    status: "error",
    endedAt: new Date(),
  });
}

export function getSession(db: Database, sessionId: string) {
  return findVoiceSessionById(db, sessionId);
}

export function getActiveSession(db: Database, userId: string, teamId: string) {
  return findActiveVoiceSession(db, userId, teamId);
}

export function getSessionHistory(
  db: Database,
  userId: string,
  teamId: string,
  options: { limit?: number; offset?: number } = {}
) {
  return listVoiceSessions(db, userId, teamId, options);
}

export async function getStats(
  db: Database,
  userId: string,
  teamId: string,
  since: Date
) {
  const result = await getVoiceSessionStats(db, userId, teamId, since);

  return {
    sessionCount: result._count,
    totalDuration: result._sum.duration ?? 0,
    totalWordsSpoken: result._sum.wordsSpoken ?? 0,
    totalToolCalls: result._sum.toolCalls ?? 0,
  };
}
