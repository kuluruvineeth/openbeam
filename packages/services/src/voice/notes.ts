import {
  countVoiceNotes,
  createVoiceNote,
  type Database,
  deleteVoiceNote,
  findVoiceNoteById,
  listVoiceNotes,
} from "@openplane/db";
import type {
  CreateVoiceNoteInput,
  ListVoiceNotesInput,
} from "@openplane/types/services/voice";

export function createNote(
  db: Database,
  userId: string,
  teamId: string,
  input: CreateVoiceNoteInput
) {
  return createVoiceNote(db, {
    userId,
    teamId,
    text: input.text,
    audioUrl: input.audioUrl,
    duration: input.duration,
    context: input.context,
    tags: input.tags,
  });
}

export function getNote(
  db: Database,
  noteId: string,
  userId: string,
  teamId: string
) {
  return findVoiceNoteById(db, noteId, userId, teamId);
}

export async function getNotes(
  db: Database,
  userId: string,
  teamId: string,
  input: ListVoiceNotesInput
) {
  const [notes, total] = await Promise.all([
    listVoiceNotes(db, userId, teamId, {
      limit: input.limit,
      cursor: input.cursor,
      search: input.search,
    }),
    countVoiceNotes(db, userId, teamId),
  ]);

  const nextCursor =
    notes.length === input.limit ? notes.at(-1)?.id : undefined;

  return { notes, total, nextCursor };
}

export async function removeNote(
  db: Database,
  noteId: string,
  userId: string,
  teamId: string
) {
  const result = await deleteVoiceNote(db, noteId, userId, teamId);
  return result.count > 0;
}
