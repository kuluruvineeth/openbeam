import type { Database, Prisma } from "../index";

export function createVoiceNote(
  db: Database,
  data: {
    userId: string;
    teamId: string;
    text: string;
    audioUrl?: string;
    duration?: number;
    context?: Prisma.InputJsonValue;
    tags?: string[];
  }
) {
  return db.voiceNote.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      text: data.text,
      audioUrl: data.audioUrl,
      duration: data.duration,
      context: data.context ?? undefined,
      tags: data.tags ?? [],
    },
  });
}

export function deleteVoiceNote(
  db: Database,
  id: string,
  userId: string,
  teamId: string
) {
  return db.voiceNote.deleteMany({
    where: { id, userId, teamId },
  });
}

export function upsertVoiceSettings(
  db: Database,
  userId: string,
  data: {
    engine?: string;
    model?: string;
    language?: string;
    formatting?: boolean;
    formatStyle?: string;
    shortcuts?: Prisma.InputJsonValue;
    vocabulary?: string[];
    widgetPosition?: string;
    widgetOpacity?: number;
    autoHide?: boolean;
  }
) {
  return db.voiceSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export function createVoiceSession(
  db: Database,
  data: {
    userId: string;
    teamId: string;
    roomType: string;
    roomName?: string;
  }
) {
  return db.voiceSession.create({
    data: {
      userId: data.userId,
      teamId: data.teamId,
      roomType: data.roomType,
      roomName: data.roomName,
    },
  });
}

export function updateVoiceSession(
  db: Database,
  id: string,
  data: {
    endedAt?: Date;
    duration?: number;
    wordsSpoken?: number;
    toolCalls?: number;
    status?: string;
  }
) {
  return db.voiceSession.update({
    where: { id },
    data,
  });
}

export function endVoiceSession(
  db: Database,
  id: string,
  data: {
    duration: number;
    wordsSpoken: number;
    toolCalls: number;
  }
) {
  return db.voiceSession.update({
    where: { id },
    data: {
      endedAt: new Date(),
      status: "completed",
      duration: data.duration,
      wordsSpoken: data.wordsSpoken,
      toolCalls: data.toolCalls,
    },
  });
}
