import Evernote from "evernote";
import { type EvernoteClient, withRateLimit } from "../client";

export interface NoteActionResult {
  success: boolean;
  noteGuid?: string;
  url?: string;
  error?: string;
}

interface CreateNoteParams {
  title: string;
  content: string;
  notebookGuid?: string;
  tagNames?: string[];
}

export async function createNote(
  client: EvernoteClient,
  params: CreateNoteParams
): Promise<NoteActionResult> {
  try {
    const note = new Evernote.Types.Note();
    note.title = params.title;
    note.content = wrapInEnml(params.content);
    if (params.notebookGuid) {
      note.notebookGuid = params.notebookGuid;
    }
    if (params.tagNames && params.tagNames.length > 0) {
      note.tagNames = params.tagNames;
    }

    const created = await withRateLimit(client, "createNote", () =>
      client.noteStore.createNote(note)
    );

    const guid = created.guid ?? "";
    return {
      success: true,
      noteGuid: guid,
      url: buildNoteUrl(guid),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

interface UpdateNoteParams {
  noteGuid: string;
  title?: string;
  content?: string;
  tagNames?: string[];
}

export async function updateNote(
  client: EvernoteClient,
  params: UpdateNoteParams
): Promise<NoteActionResult> {
  try {
    const note = new Evernote.Types.Note();
    note.guid = params.noteGuid;
    if (params.title) {
      note.title = params.title;
    }
    if (params.content) {
      note.content = wrapInEnml(params.content);
    }
    if (params.tagNames) {
      note.tagNames = params.tagNames;
    }

    await withRateLimit(client, "updateNote", () =>
      client.noteStore.updateNote(note)
    );

    return {
      success: true,
      noteGuid: params.noteGuid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update note",
    };
  }
}

export async function deleteNote(
  client: EvernoteClient,
  noteGuid: string
): Promise<NoteActionResult> {
  try {
    await withRateLimit(client, "deleteNote", () =>
      client.noteStore.deleteNote(noteGuid)
    );

    return {
      success: true,
      noteGuid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}

function wrapInEnml(plainText: string): string {
  const escaped = plainText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const htmlBody = escaped
    .split("\n")
    .map((line) => `<div>${line || "<br/>"}</div>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${htmlBody}</en-note>`;
}

function buildNoteUrl(guid: string): string {
  return `https://www.evernote.com/shard/s1/nl/${guid}`;
}
