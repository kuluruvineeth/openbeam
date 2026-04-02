import {
  type EvernoteClient,
  type EvernoteNote,
  withRateLimit,
} from "../client";

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
    const note: EvernoteNote = {
      title: params.title,
      content: wrapInEnml(params.content),
      notebookGuid: params.notebookGuid,
      tagNames: params.tagNames?.length ? params.tagNames : undefined,
    };

    const created = await withRateLimit(client, "createNote", () =>
      client.createNote(note)
    );

    const guid = created.guid ?? "";
    return { success: true, noteGuid: guid, url: buildNoteUrl(guid) };
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
    const note: EvernoteNote = {
      guid: params.noteGuid,
      title: params.title,
      content: params.content ? wrapInEnml(params.content) : undefined,
      tagNames: params.tagNames,
    };

    await withRateLimit(client, "updateNote", () => client.updateNote(note));

    return { success: true, noteGuid: params.noteGuid };
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
      client.deleteNote(noteGuid)
    );
    return { success: true, noteGuid };
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
